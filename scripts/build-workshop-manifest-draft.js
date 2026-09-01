/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_ROOT = path.resolve(process.cwd(), ".tmp/workshop-assets");

function parseArgs(argv) {
  const args = {
    expected: path.join(DEFAULT_ROOT, "manifest-expected.json"),
    verificationRoot: path.join(DEFAULT_ROOT, "verification"),
    output: path.join(DEFAULT_ROOT, "verification", "combined-manifest-draft.sql"),
  };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--expected") args.expected = path.resolve(argv[++index]);
    else if (argv[index] === "--verification-root") args.verificationRoot = path.resolve(argv[++index]);
    else if (argv[index] === "--output") args.output = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function sqlValue(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function validateEntry(entry) {
  if (!["tile_group", "point_cloud"].includes(entry.entryType)) return "Unsupported manifest entry type.";
  if (!entry.clientId || !entry.surveyId || !entry.referenceKey || !entry.destinationStorageAlias || !entry.nginxRoutePattern) return "Manifest entry is incomplete.";
  if (entry.protectionLevel === "organization" && !entry.organizationId) return "Organization manifest entry requires organizationId.";
  if (entry.protectionLevel === "private" && entry.organizationId !== null) return "Private manifest entry requires null organizationId.";
  if (!["organization", "private"].includes(entry.protectionLevel)) return "Manifest entry protection level must be organization or private.";
  return null;
}

function buildSql({ datasetYear, entries, reportHashes, verifiedObjects, verifiedBytes }) {
  const values = entries.map((entry) => [
    entry.entryType,
    entry.organizationId,
    entry.clientId,
    entry.surveyId,
    entry.referenceKey,
    entry.destinationStorageAlias,
    entry.nginxRoutePattern,
    entry.protectionLevel,
  ]);
  const valuesSql = values.map((entry) => `  (:new_manifest_id, ${entry.map(sqlValue).join(", ")}, '{"verified":true}'::jsonb)`).join(",\n");
  return [
    "-- REVIEW ONLY. This file never runs automatically.",
    "-- This combined draft is generated only after every expected survey has a complete verification report.",
    "-- Replace :new_manifest_id and :new_manifest_key only in the separately reviewed staging SQL workflow.",
    `-- Verification reports: ${reportHashes.length}; objects: ${verifiedObjects}; bytes: ${verifiedBytes}.`,
    ...reportHashes.map((item) => `-- ${item.file}: sha256 ${item.sha256}`),
    "",
    "insert into public.workshop_manifests (id, manifest_key, status, dataset_year, supersedes_manifest_id, title)",
    `select :new_manifest_id, :new_manifest_key, 'draft', ${datasetYear}, id, 'Workshop asset batch'`,
    `from public.workshop_manifests where dataset_year = ${datasetYear} and status = 'approved' and is_active = true;`,
    "",
    "insert into public.workshop_manifest_entries (manifest_id, entry_type, organization_id, client_id, survey_id, reference_key, destination_storage_alias, nginx_route_pattern, protection_level, verification)",
    "values",
    `${valuesSql};`,
    "",
    "-- Do not approve, activate, or supersede the old manifest from this generated draft.",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const expected = await readJson(args.expected);
  const expectedIds = new Set((expected.surveyIds ?? []).map((value) => String(value).trim().toUpperCase()));
  if (expected.version !== 1 || expected.targetEnvironment !== "staging" || expected.datasetYear !== 2026 || !expectedIds.size) {
    throw new Error("Expected-manifest file must select staging dataset year 2026 and at least one survey.");
  }
  if (expectedIds.size !== expected.surveyIds.length) throw new Error("Expected-manifest survey IDs must be unique.");

  let verificationFiles = [];
  try {
    verificationFiles = await fs.readdir(args.verificationRoot);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const files = verificationFiles.filter((file) => file.endsWith(".verification.json")).sort();
  const selectedReports = [];
  for (const file of files) {
    const filePath = path.join(args.verificationRoot, file);
    const source = await fs.readFile(filePath);
    const report = JSON.parse(source.toString("utf8"));
    const reportIds = new Set((report.manifestEntries ?? []).map((entry) => String(entry.surveyId).toUpperCase()));
    if ([...reportIds].some((surveyId) => expectedIds.has(surveyId))) {
      if ([...reportIds].some((surveyId) => !expectedIds.has(surveyId))) throw new Error(`${file} mixes expected and unexpected surveys.`);
      if (!report.completedAt || !report.summary?.verifiedObjects || !report.manifestEntries?.length) throw new Error(`${file} is not a complete verification report.`);
      selectedReports.push({ file, report, sha256: crypto.createHash("sha256").update(source).digest("hex") });
    }
  }

  const surveyReports = new Map();
  const entries = [];
  for (const selected of selectedReports) {
    for (const entry of selected.report.manifestEntries) {
      const surveyId = String(entry.surveyId).toUpperCase();
      const entryError = validateEntry(entry);
      if (entryError) throw new Error(`${selected.file}: ${entryError}`);
      const reports = surveyReports.get(surveyId) ?? new Set();
      reports.add(selected.file);
      surveyReports.set(surveyId, reports);
      entries.push(entry);
    }
  }

  const missing = [...expectedIds].filter((surveyId) => !surveyReports.has(surveyId));
  const duplicated = [...surveyReports].filter(([, reports]) => reports.size !== 1).map(([surveyId]) => surveyId);
  if (missing.length) throw new Error(`Missing complete verification reports for: ${missing.join(", ")}.`);
  if (duplicated.length) throw new Error(`Multiple verification reports cover: ${duplicated.join(", ")}.`);

  const uniqueEntries = new Set(entries.map((entry) => `${entry.entryType}|${entry.referenceKey}`));
  if (uniqueEntries.size !== entries.length) throw new Error("Combined manifest contains duplicate entry type/reference keys.");

  const verifiedObjects = selectedReports.reduce((sum, item) => sum + Number(item.report.summary.verifiedObjects), 0);
  const verifiedBytes = selectedReports.reduce((sum, item) => sum + Number(item.report.summary.verifiedBytes), 0);
  const sql = buildSql({
    datasetYear: expected.datasetYear,
    entries,
    reportHashes: selectedReports.map(({ file, sha256 }) => ({ file, sha256 })),
    verifiedObjects,
    verifiedBytes,
  });
  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${sql}\n`, "utf8");
  await fs.writeFile(`${args.output}.json`, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    surveyIds: [...expectedIds].sort(),
    verificationReports: selectedReports.map(({ file, sha256 }) => ({ file, sha256 })),
    manifestEntries: entries.length,
    verifiedObjects,
    verifiedBytes,
  }, null, 2)}\n`, "utf8");
  console.log(`Combined review-only manifest draft: ${args.output}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Workshop manifest draft failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildSql, validateEntry };
