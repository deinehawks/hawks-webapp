/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { Client } = require("pg");
const dotenv = require("dotenv");

const {
  createWaves,
  discoverSurveySource,
  evaluateCapacity,
  isTemporaryDirectoryName,
  parseDfOutput,
  validateAllowlist,
} = require("./lib/workshop-assets");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const execFileAsync = promisify(execFile);
const DEFAULT_ALLOWLIST = path.resolve(process.cwd(), ".tmp/workshop-assets/allowlist.json");
const DEFAULT_OUTPUT_ROOT = path.resolve(process.cwd(), ".tmp/workshop-assets");
const STAGING_SUPABASE_PROJECT_REF = "llealjcaqvltrtdwwzrh";

function parseArgs(argv) {
  const args = { allowlist: DEFAULT_ALLOWLIST, outputRoot: DEFAULT_OUTPUT_ROOT };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--allowlist") args.allowlist = path.resolve(argv[++index]);
    else if (argv[index] === "--output-root") args.outputRoot = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function collectFiles(root, predicate = () => true) {
  const files = [];
  const queue = [root];
  while (queue.length) {
    const directory = queue.shift();
    let entries = [];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const entry of entries) {
      if (isTemporaryDirectoryName(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) queue.push(fullPath);
      else if (entry.isFile() && predicate(fullPath)) {
        const stats = await fs.stat(fullPath);
        files.push({ sourceFile: fullPath, size: stats.size });
      }
    }
  }
  return files;
}

function resolveDbConfig() {
  if (process.env.SUPABASE_DB_URL) {
    if (!process.env.SUPABASE_DB_URL.includes(STAGING_SUPABASE_PROJECT_REF)) {
      throw new Error("SUPABASE_DB_URL is not the approved staging project.");
    }
    return { connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } };
  }
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!projectUrl || !password) {
    throw new Error("Populated allowlists require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_DB_PASSWORD, or SUPABASE_DB_URL.");
  }
  const projectRef = new URL(projectUrl).hostname.split(".")[0];
  if (projectRef !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not the approved staging project.");
  }
  return {
    host: process.env.SUPABASE_DB_HOST ?? `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    database: process.env.SUPABASE_DB_NAME ?? "postgres",
    user: process.env.SUPABASE_DB_USER ?? "postgres",
    password,
    ssl: { rejectUnauthorized: false },
  };
}

async function inventoryStaging(surveyIds) {
  if (!surveyIds.length) return [];
  const client = new Client(resolveDbConfig());
  await client.connect();
  try {
    await client.query("begin read only");
    const result = await client.query(
      `select s.id as survey_id, s.client_id, c.code as client_code,
              mapping.organization_id, organization.status as organization_status,
              ortho.tile_folder
         from public.surveys as s
         left join public.clients as c on c.id = s.client_id
         left join public.client_organizations as mapping
           on mapping.client_id = s.client_id
          and mapping.review_status = 'confirmed'
          and mapping.is_primary = true
         left join public.organizations as organization
           on organization.id = mapping.organization_id
         left join lateral (
           select o.tile_folder
             from public.orthos as o
            where o.survey_id = s.id and o.is_current = true
            order by o.created_at desc
            limit 1
         ) as ortho on true
        where s.id = any($1::text[])
        order by s.id`,
      [surveyIds],
    );
    await client.query("rollback");
    return result.rows;
  } finally {
    await client.end();
  }
}

async function readCapacity(remainingBytes) {
  const container = process.env.MINIO_DOCKER_CONTAINER ?? "hawks-minio";
  const dataPath = process.env.MINIO_DATA_PATH ?? "/data";
  try {
    const { stdout } = await execFileAsync("docker", ["exec", container, "df", "-B1", dataPath], { windowsHide: true });
    return { status: "checked", ...evaluateCapacity({ ...parseDfOutput(stdout), remainingBytes }) };
  } catch (error) {
    return { status: "blocked", allowed: false, reason: `Could not read MinIO capacity: ${error.message}` };
  }
}

function databaseBlock(row) {
  if (!row) return "Survey row is missing from staging.";
  if (!row.client_id || !row.client_code) return "Survey has no canonical client relationship.";
  if (!row.organization_id) return "Client has no confirmed primary organization mapping.";
  if (row.organization_status !== "active") return "Mapped organization is not active.";
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const raw = await readJson(args.allowlist);
  const { errors, allowlist } = validateAllowlist(raw);
  if (errors.length) throw new Error(`Allowlist validation failed:\n- ${errors.join("\n- ")}`);

  const report = {
    createdAt: new Date().toISOString(),
    mode: "dry-run-only",
    allowlistPath: args.allowlist,
    permanentExclusions: ["AH-026012", "AH-026013"],
    ignoredPointClouds: allowlist.ignoredPointClouds,
    surveys: [],
    blocked: [],
    unreviewedPointClouds: [],
    generatedWaves: [],
  };
  if (!allowlist.approvedSurveys.length) {
    report.capacity = { status: "not-required", allowed: true, reason: "Empty allowlist has no planned transfer." };
    await writeJson(path.join(args.outputRoot, "inventory.json"), report);
    await writeJson(path.join(args.outputRoot, "blocked-items.json"), { blocked: [] });
    console.log("Dry-run complete: allowlist is empty, so no upload jobs were generated.");
    return;
  }

  const ids = allowlist.approvedSurveys.map((item) => item.surveyId);
  const dbRows = new Map((await inventoryStaging(ids)).map((row) => [row.survey_id, row]));
  const approvedPc = new Map();
  for (const pointCloud of allowlist.approvedPointClouds) {
    const list = approvedPc.get(pointCloud.surveyId) ?? [];
    list.push(pointCloud);
    approvedPc.set(pointCloud.surveyId, list);
  }
  const reviewedPcPaths = new Set([
    ...allowlist.approvedPointClouds.map((item) => item.sourceFile.toLowerCase()),
    ...allowlist.ignoredPointClouds.map((item) => item.sourceFile.toLowerCase()),
  ]);
  const ready = [];

  for (const survey of allowlist.approvedSurveys) {
    const source = await discoverSurveySource(allowlist.sourceRoot, survey.surveyId, survey.tileVariant);
    const row = dbRows.get(survey.surveyId);
    const reasons = [];
    if (source.status !== "ready") reasons.push(source.reason);
    const dbReason = databaseBlock(row);
    if (dbReason) reasons.push(dbReason);

    let tileStats = { files: [], totalBytes: 0 };
    let discoveredPointClouds = [];
    if (source.status === "ready") {
      if (survey.includeTiles) {
        const files = await collectFiles(source.tileRoot, (file) => file.toLowerCase().endsWith(".png"));
        tileStats = { fileCount: files.length, totalBytes: files.reduce((sum, item) => sum + item.size, 0) };
        if (!files.length) reasons.push("Selected tile variant contains no PNG tiles.");
      }
      discoveredPointClouds = await collectFiles(source.rgbRoot, (file) => file.toLowerCase().endsWith(".pcd"));
    }

    const unreviewed = discoveredPointClouds.filter((item) => !reviewedPcPaths.has(item.sourceFile.toLowerCase()));
    if (unreviewed.length) {
      reasons.push("One or more discovered point clouds are neither approved nor ignored.");
      report.unreviewedPointClouds.push(...unreviewed.map((item) => ({ surveyId: survey.surveyId, ...item })));
    }

    const approved = approvedPc.get(survey.surveyId) ?? [];
    const pointClouds = [];
    for (const item of approved) {
      const relative = path.relative(allowlist.sourceRoot, item.sourceFile);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        reasons.push(`Approved point cloud is outside sourceRoot: ${item.sourceFile}`);
        continue;
      }
      try {
        const stats = await fs.stat(item.sourceFile);
        pointClouds.push({ ...item, size: stats.size });
      } catch (error) {
        reasons.push(`Approved point cloud is unavailable: ${item.sourceFile} (${error.code ?? error.message})`);
      }
    }

    if (!survey.includeTiles && !pointClouds.length) {
      reasons.push("Survey selects neither tiles nor an approved point cloud.");
    }
    const item = { surveyId: survey.surveyId, tileVariant: survey.tileVariant, source, staging: row ?? null, tileStats, pointClouds, status: reasons.length ? "blocked" : "ready", reasons };
    report.surveys.push(item);
    if (reasons.length) report.blocked.push({ surveyId: survey.surveyId, reasons });
    else ready.push(item);
  }

  const remainingBytes = ready.reduce((sum, item) => sum + item.tileStats.totalBytes + item.pointClouds.reduce((pcSum, pc) => pcSum + pc.size, 0), 0);
  report.capacity = await readCapacity(remainingBytes);
  if (!report.capacity.allowed) report.blocked.push({ surveyId: null, reasons: [report.capacity.reason ?? "MinIO capacity reserve would be violated."] });

  if (!report.blocked.length) {
    const waves = createWaves(ready, allowlist.maxSurveysPerWave);
    for (let index = 0; index < waves.length; index += 1) {
      const waveId = `wave-${String(index + 1).padStart(3, "0")}`;
      const config = {
        workflowVersion: 1,
        targetEnvironment: "staging",
        generatedAt: report.createdAt,
        reviewed: false,
        waveId,
        capacityGuard: { enabled: true, reserveRatio: 0.15, minimumReserveBytes: 107374182400, transferOverheadRatio: 0.1 },
        defaults: { uploadConcurrency: 3, pointCloudPartSizeBytes: 67108864, pointCloudQueueSize: 2, manifest: { protectionLevel: "organization" } },
        jobs: waves[index].map((item) => ({
          id: `${item.staging.client_code.toLowerCase()}-${item.surveyId.toLowerCase()}`,
          clientCode: item.staging.client_code.toLowerCase(),
          year: allowlist.datasetYear,
          surveyId: item.surveyId,
          manifest: { organizationId: item.staging.organization_id, clientId: item.staging.client_id },
          tiles: item.source.status === "ready" && item.tileStats.fileCount ? [{ tileFolder: item.tileVariant, sourceRoot: item.source.tileRoot, destinationAlias: "tiles", sourceAlias: "workshop-z-drive" }] : [],
          pointClouds: item.pointClouds.map((pc) => ({ sourceFile: pc.sourceFile, file: path.basename(pc.sourceFile), destinationAlias: "pointclouds", sourceAlias: "workshop-z-drive" })),
        })),
      };
      const outputPath = path.join(args.outputRoot, "generated", `${waveId}.jobs.json`);
      await writeJson(outputPath, config);
      report.generatedWaves.push({ waveId, outputPath, surveyIds: waves[index].map((item) => item.surveyId) });
    }
  }

  await writeJson(path.join(args.outputRoot, "inventory.json"), report);
  await writeJson(path.join(args.outputRoot, "capacity-assessment.json"), report.capacity);
  await writeJson(path.join(args.outputRoot, "blocked-items.json"), { blocked: report.blocked, unreviewedPointClouds: report.unreviewedPointClouds });
  if (report.blocked.length) {
    process.exitCode = 2;
    console.error(`Dry-run blocked. Review ${path.join(args.outputRoot, "blocked-items.json")}.`);
  } else {
    console.log(`Dry-run complete. Generated ${report.generatedWaves.length} wave job file(s); review them before freezing.`);
  }
}

main().catch((error) => {
  console.error("Workshop asset preparation failed:", error.message);
  process.exitCode = 1;
});
