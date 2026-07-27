const { createHash } = require("node:crypto");
const path = require("node:path");

const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const applyChanges = process.argv.includes("--apply");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = supabase.storage.from("detected-objects");

function digest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function downloadBuffer(objectPath) {
  const { data, error } = await bucket.download(objectPath);
  if (error || !data) return { data: null, error };

  return {
    data: Buffer.from(await data.arrayBuffer()),
    error: null,
  };
}

async function getRootJsonObjects() {
  const objects = [];
  const pageSize = 100;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await bucket.list("", {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;
    objects.push(...data.filter((item) => item.name.endsWith(".json")));
    if (data.length < pageSize) break;
  }

  return objects;
}

async function migrateObject(client, sourceName) {
  const destination = `${client.id}/detections.json`;
  const sourceResult = await downloadBuffer(sourceName);

  if (sourceResult.error || !sourceResult.data) {
    return {
      status: "failed",
      source: sourceName,
      destination,
      reason: sourceResult.error?.message ?? "source download failed",
    };
  }

  const sourceDigest = digest(sourceResult.data);
  const destinationResult = await downloadBuffer(destination);

  if (destinationResult.data) {
    const destinationDigest = digest(destinationResult.data);
    return {
      status: sourceDigest === destinationDigest ? "verified" : "failed",
      source: sourceName,
      destination,
      reason:
        sourceDigest === destinationDigest
          ? undefined
          : "destination exists with a different SHA-256 digest",
    };
  }

  if (!applyChanges) {
    return { status: "planned", source: sourceName, destination };
  }

  const { error: uploadError } = await bucket.upload(
    destination,
    sourceResult.data,
    {
      contentType: "application/json",
      upsert: false,
    },
  );

  if (uploadError) {
    return {
      status: "failed",
      source: sourceName,
      destination,
      reason: uploadError.message,
    };
  }

  const verificationResult = await downloadBuffer(destination);
  if (verificationResult.error || !verificationResult.data) {
    return {
      status: "failed",
      source: sourceName,
      destination,
      reason: verificationResult.error?.message ?? "verification failed",
    };
  }

  return {
    status:
      digest(verificationResult.data) === sourceDigest ? "copied" : "failed",
    source: sourceName,
    destination,
    reason:
      digest(verificationResult.data) === sourceDigest
        ? undefined
        : "uploaded object failed SHA-256 verification",
  };
}

async function main() {
  const [{ data: clients, error: clientsError }, rootObjects] =
    await Promise.all([
      supabase.from("clients").select("id, code").order("code"),
      getRootJsonObjects(),
    ]);

  if (clientsError) throw clientsError;

  const clientsByLegacyName = new Map(
    (clients ?? []).map((client) => [
      `${client.code.toLowerCase()}.json`,
      client,
    ]),
  );

  const unmatched = rootObjects
    .map((object) => object.name)
    .filter((name) => !clientsByLegacyName.has(name.toLowerCase()));

  if (unmatched.length > 0) {
    console.error("Legacy objects without a matching client:", unmatched);
    process.exitCode = 1;
  }

  const results = [];
  for (const object of rootObjects) {
    const client = clientsByLegacyName.get(object.name.toLowerCase());
    if (!client) continue;

    results.push(await migrateObject(client, object.name));
  }

  for (const result of results) {
    const suffix = result.reason ? `: ${result.reason}` : "";
    console.log(
      `[${result.status}] ${result.source} -> ${result.destination}${suffix}`,
    );
  }

  const failed = results.filter((result) => result.status === "failed");
  console.log(
    `${applyChanges ? "Apply" : "Dry-run"} complete: ${results.length} checked, ${failed.length} failed.`,
  );

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Detection-object migration failed:", error.message);
  process.exitCode = 1;
});
