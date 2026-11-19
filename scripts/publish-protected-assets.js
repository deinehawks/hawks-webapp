/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DEFAULT_CONFIG_PATH = path.resolve(
  process.cwd(),
  "scripts/minio-publish-jobs.example.json",
);
const REPORTS_ROOT = path.resolve(process.cwd(), ".tmp/minio-publish-reports");
const STATE_ROOT = path.resolve(process.cwd(), ".tmp/minio-publish-state");

function parseArgs(argv) {
  const args = {
    apply: false,
    config: DEFAULT_CONFIG_PATH,
    job: null,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--apply") {
      args.apply = true;
      continue;
    }

    if (token === "--config") {
      args.config = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--job") {
      args.job = argv[index + 1];
      index += 1;
      continue;
    }
  }

  return args;
}

function cleanPathSegment(value) {
  return String(value).replace(/^\/+|\/+$/g, "");
}

function safeFileLabel(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "-");
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const decimals = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function resolveStorageRoot(alias) {
  const envKey = `PROTECTED_ASSET_STORAGE_${alias
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")}_ROOT`;

  const configured =
    process.env[envKey] ?? process.env.PROTECTED_ASSET_STORAGE_ROOT ?? alias;

  return cleanPathSegment(configured);
}

function resolveStorageLocation(alias, objectPath) {
  const root = resolveStorageRoot(alias);
  const [bucket, ...prefixParts] = root.split("/").filter(Boolean);

  if (!bucket) {
    throw new Error(`Could not resolve a bucket for alias "${alias}".`);
  }

  const key = [...prefixParts, cleanPathSegment(objectPath)]
    .filter(Boolean)
    .join("/");

  return { bucket, key, root };
}

function hashHex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest(encoding);
}

function getSignatureKey(secretKey, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
  return crypto.createHmac("sha256", kService).update("aws4_request").digest();
}

function buildSignedHeaders(headers) {
  return Object.keys(headers)
    .map((name) => name.toLowerCase())
    .sort()
    .join(";");
}

function buildCanonicalHeaders(headers) {
  return Object.keys(headers)
    .map((name) => name.toLowerCase())
    .sort()
    .map((name) => `${name}:${String(headers[name]).trim().replace(/\s+/g, " ")}`)
    .join("\n");
}

function buildAuthorizationHeaders({
  method,
  url,
  payloadHash,
  accessKey,
  secretKey,
  region,
  extraHeaders = {},
}) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const headers = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...extraHeaders,
  };

  const canonicalUri = url.pathname
    .split("/")
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join("/")
    .replace(/%2F/g, "/");
  const canonicalQueryString = "";
  const canonicalHeaders = `${buildCanonicalHeaders(headers)}\n`;
  const signedHeaders = buildSignedHeaders(headers);
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashHex(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(secretKey, dateStamp, region, "s3");
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  return {
    ...headers,
    Authorization: [
      "AWS4-HMAC-SHA256 Credential=",
      `${accessKey}/${credentialScope}, `,
      `SignedHeaders=${signedHeaders}, `,
      `Signature=${signature}`,
    ].join(""),
  };
}

async function s3PutObject({ endpoint, region, accessKey, secretKey, bucket, key, buffer, contentType }) {
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const url = new URL(`${endpoint.replace(/\/+$/g, "")}/${bucket}/${encodedKey}`);
  const payloadHash = hashHex(buffer);
  const headers = buildAuthorizationHeaders({
    method: "PUT",
    url,
    payloadHash,
    accessKey,
    secretKey,
    region,
    extraHeaders: {
      "content-length": String(buffer.length),
      "content-type": contentType,
    },
  });

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: buffer,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PUT ${bucket}/${key} failed (${response.status}): ${body}`);
  }

  return {
    etag: response.headers.get("etag"),
    requestId: response.headers.get("x-amz-request-id"),
  };
}

async function ensureDirectory(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function readJson(jsonPath) {
  return JSON.parse(await fs.readFile(jsonPath, "utf8"));
}

async function writeJson(jsonPath, value) {
  await ensureDirectory(path.dirname(jsonPath));
  await fs.writeFile(jsonPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function statFile(fullPath) {
  const stats = await fs.stat(fullPath);
  return { size: stats.size, mtimeMs: stats.mtimeMs };
}

async function listDirectoryEntries(fullPath, withFileTypes = false) {
  return fs.readdir(fullPath, { withFileTypes });
}

async function collectFiles(rootPath, basePath = rootPath) {
  const entries = await listDirectoryEntries(rootPath, true);
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, basePath)));
      continue;
    }

    if (entry.isFile()) {
      const { size, mtimeMs } = await statFile(fullPath);
      files.push({
        fullPath,
        relativePath: path.relative(basePath, fullPath).replace(/\\/g, "/"),
        size,
        mtimeMs,
      });
    }
  }

  return files;
}

async function collectFolderStats(folderPath) {
  const files = await collectFiles(folderPath);
  return {
    folderPath,
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    files,
  };
}

function inferContentType(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".pcd")) return "application/octet-stream";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".xml")) return "application/xml";
  return "application/octet-stream";
}

function buildBatchId(parts) {
  return parts.map((part) => safeFileLabel(part)).join("__");
}

function buildTileRoutePattern({ clientCode, year, surveyId, tileFolder }) {
  return `/asimov-hawks/tiles/${clientCode.toLowerCase()}/${year}/${surveyId}/ortho/${tileFolder}/{z}/{x}/{y}.png`;
}

function buildPointCloudRoutePattern({ clientCode, year, surveyId, fileName }) {
  return `/asimov-hawks/3d/${clientCode.toLowerCase()}/${year}/${surveyId}/${fileName}`;
}

function getManifestDefaults(config, job) {
  return {
    ...(config.defaults?.manifest ?? {}),
    ...(job.manifest ?? {}),
  };
}

function escapeSqlString(value) {
  return String(value).replace(/'/g, "''");
}

function formatSqlValue(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") {
    return `'${escapeSqlString(JSON.stringify(value))}'::jsonb`;
  }

  return `'${escapeSqlString(value)}'`;
}

function buildManifestInsertSql({
  manifestIdPlaceholder,
  manifestEntryDrafts,
}) {
  const manifestIdValue = manifestIdPlaceholder ?? ":new_manifest_id";
  const columns = [
    "manifest_id",
    "entry_type",
    "organization_id",
    "client_id",
    "survey_id",
    "reference_key",
    "display_label",
    "source_alias",
    "destination_storage_alias",
    "destination_prefix_alias",
    "nginx_route_pattern",
    "protection_level",
    "metadata",
    "notes",
  ];

  const valuesSql = manifestEntryDrafts
    .map((entry) =>
      [
        manifestIdValue,
        formatSqlValue(entry.entry_type),
        formatSqlValue(entry.organization_id),
        formatSqlValue(entry.client_id),
        formatSqlValue(entry.survey_id),
        formatSqlValue(entry.reference_key),
        formatSqlValue(entry.display_label),
        formatSqlValue(entry.source_alias),
        formatSqlValue(entry.destination_storage_alias),
        formatSqlValue(entry.destination_prefix_alias),
        formatSqlValue(entry.nginx_route_pattern),
        formatSqlValue(entry.protection_level),
        formatSqlValue(entry.metadata),
        formatSqlValue(entry.notes),
      ].join(", "),
    )
    .map((row) => `  (${row})`)
    .join(",\n");

  return [
    "insert into public.workshop_manifest_entries (",
    `  ${columns.join(",\n  ")}`,
    ")",
    "values",
    valuesSql + ";",
  ].join("\n");
}

function buildManifestTileFolderAuditSql(tileFolderExpectations) {
  if (tileFolderExpectations.length === 0) return null;

  const surveyIds = tileFolderExpectations.map((item) => item.surveyId);
  const surveyList = surveyIds.map(formatSqlValue).join(", ");
  const caseRows = tileFolderExpectations
    .map(
      (item) =>
        `  when ${formatSqlValue(item.surveyId)} then ${formatSqlValue(item.tileFolder)}`,
    )
    .join("\n");

  return [
    "-- Verify the app metadata matches the protected tile manifest before approval.",
    "select survey_id, tile_folder, is_current",
    "from public.orthos",
    `where survey_id in (${surveyList})`,
    "order by survey_id, is_current desc;",
    "",
    "-- Run only when the current ortho tile_folder differs from the manifest route.",
    "update public.orthos",
    "set tile_folder = case survey_id",
    caseRows,
    "end",
    `where survey_id in (${surveyList})`,
    "  and is_current = true",
    "  and tile_folder is distinct from case survey_id",
    caseRows,
    "end;",
    "",
    "-- Recheck after the update; the browser must request the same folder the manifest allows.",
    "select survey_id, tile_folder, is_current",
    "from public.orthos",
    `where survey_id in (${surveyList})`,
    "order by survey_id, is_current desc;",
  ].join("\n");
}

function buildManifestReviewSql({ manifestInsertSql, tileFolderAuditSql }) {
  return [
    tileFolderAuditSql,
    tileFolderAuditSql ? "" : null,
    "-- Insert manifest entries after confirming orthos.tile_folder alignment.",
    manifestInsertSql,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildTileFolderExpectations(plan) {
  const expectationsBySurvey = new Map();

  for (const task of plan.tasks) {
    if (task.kind !== "tiles") continue;

    const previous = expectationsBySurvey.get(plan.surveyId);
    if (previous && previous.tileFolder !== task.tileFolder) {
      previous.hasMultipleTileFolders = true;
      previous.tileFolders.push(task.tileFolder);
      continue;
    }

    expectationsBySurvey.set(plan.surveyId, {
      surveyId: plan.surveyId,
      clientCode: plan.clientCode,
      year: plan.year,
      tileFolder: task.tileFolder,
      tileFolders: [task.tileFolder],
      hasMultipleTileFolders: false,
    });
  }

  return [...expectationsBySurvey.values()];
}

function buildJobWarnings({ plan, tileFolderExpectations }) {
  const warnings = [];

  for (const task of plan.tasks) {
    if (task.kind !== "tiles") continue;

    if (
      task.displayLabel &&
      !String(task.displayLabel)
        .toLowerCase()
        .includes(String(task.tileFolder).toLowerCase())
    ) {
      warnings.push(
        `Tile displayLabel "${task.displayLabel}" does not include configured tileFolder "${task.tileFolder}".`,
      );
    }
  }

  for (const expectation of tileFolderExpectations) {
    if (!expectation.hasMultipleTileFolders) continue;
    warnings.push(
      `Survey ${expectation.surveyId} has multiple tile folders in one job (${expectation.tileFolders.join(", ")}). The app uses one current orthos.tile_folder, so approve only the folder that should render by default or split the migration.`,
    );
  }

  return warnings;
}
function buildTileManifestEntryDraft({ job, task, manifestDefaults }) {
  const objectPath = task.destinationObjectRoot;

  return {
    entry_type: "tile_group",
    organization_id: manifestDefaults.organizationId ?? null,
    client_id: manifestDefaults.clientId ?? null,
    survey_id: job.surveyId,
    reference_key: objectPath,
    display_label:
      task.displayLabel ?? `${job.surveyId} orthomap ${task.tileFolder}`,
    source_alias: task.sourceAlias ?? "local-public-tiles",
    destination_storage_alias: task.alias,
    destination_prefix_alias: null,
    nginx_route_pattern: buildTileRoutePattern({
      clientCode: job.clientCode,
      year: job.year,
      surveyId: job.surveyId,
      tileFolder: task.tileFolder,
    }),
    protection_level: manifestDefaults.protectionLevel ?? "organization",
    metadata: {
      client_code: job.clientCode,
      survey_id: job.surveyId,
      tile_folder: task.tileFolder,
      object_path: objectPath,
    },
    notes:
      "Generated by scripts/publish-protected-assets.js. Keep destination_prefix_alias null unless a real code alias exists. Confirm public.orthos.tile_folder matches metadata.tile_folder before approval.",
  };
}

function buildPointCloudManifestEntryDraft({ job, task, manifestDefaults }) {
  const objectPath = task.objectPath;

  return {
    entry_type: "point_cloud",
    organization_id: manifestDefaults.organizationId ?? null,
    client_id: manifestDefaults.clientId ?? null,
    survey_id: job.surveyId,
    reference_key: objectPath,
    display_label:
      task.displayLabel ??
      `${job.surveyId} ${task.fileName.replace(/\.pcd$/i, "").toUpperCase()} point cloud`,
    source_alias: task.sourceAlias ?? "local-public-3d",
    destination_storage_alias: task.alias,
    destination_prefix_alias: null,
    nginx_route_pattern: buildPointCloudRoutePattern({
      clientCode: job.clientCode,
      year: job.year,
      surveyId: job.surveyId,
      fileName: task.fileName,
    }),
    protection_level: manifestDefaults.protectionLevel ?? "organization",
    metadata: {
      client_code: job.clientCode,
      survey_id: job.surveyId,
      file_name: task.fileName,
      object_path: objectPath,
    },
    notes:
      "Generated by scripts/publish-protected-assets.js. metadata.object_path is the full MinIO object key for point clouds.",
  };
}

function createTileBatches(folderStats, batchConfig) {
  const batches = [];
  let current = {
    groups: [],
    totalFiles: 0,
    totalBytes: 0,
  };

  const flushCurrent = () => {
    if (!current.groups.length) return;
    batches.push(current);
    current = {
      groups: [],
      totalFiles: 0,
      totalBytes: 0,
    };
  };

  for (const group of folderStats) {
    const exceedsCurrent =
      current.groups.length > 0 &&
      (current.groups.length >= batchConfig.maxGroupsPerBatch ||
        current.totalFiles + group.fileCount > batchConfig.maxFilesPerBatch ||
        current.totalBytes + group.totalBytes > batchConfig.maxBytesPerBatch);

    if (exceedsCurrent) {
      flushCurrent();
    }

    current.groups.push(group);
    current.totalFiles += group.fileCount;
    current.totalBytes += group.totalBytes;
  }

  flushCurrent();
  return batches;
}

async function buildTileTask({ job, tile, tileDefaults }) {
  const sourceRoot = path.resolve(
    process.cwd(),
    tile.sourceRoot ??
      path.join(
        "public",
        "tiles",
        job.clientCode,
        String(job.year),
        job.surveyId,
        "ortho",
        tile.tileFolder,
      ),
  );
  const destinationObjectRoot = cleanPathSegment(
    tile.destinationObjectRoot ??
      `${job.clientCode}/${job.year}/${job.surveyId}/ortho/${tile.tileFolder}`,
  );

  const zoomEntries = await listDirectoryEntries(sourceRoot, true);
  const zoomDirs = zoomEntries
    .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => Number(left) - Number(right));

  const batches = [];

  for (const zoom of zoomDirs) {
    const zoomPath = path.join(sourceRoot, zoom);
    const zoomEntries = await listDirectoryEntries(zoomPath, true);
    const xFolders = zoomEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    if (xFolders.length === 0) {
      const files = await collectFiles(zoomPath);
      if (files.length === 0) continue;

      batches.push({
        id: buildBatchId([job.id, tile.tileFolder, `z${zoom}`, "root"]),
        kind: "tile-batch",
        tileFolder: tile.tileFolder,
        zoom,
        sourceRoot,
        objectRoot: destinationObjectRoot,
        relativeObjectRoot: `${destinationObjectRoot}/${zoom}`,
        groups: [
          {
            name: "root",
            relativePath: zoom,
            fileCount: files.length,
            totalBytes: files.reduce((sum, file) => sum + file.size, 0),
            files,
          },
        ],
        fileCount: files.length,
        totalBytes: files.reduce((sum, file) => sum + file.size, 0),
      });
      continue;
    }

    const folderStats = [];
    for (const xFolder of xFolders) {
      const folderPath = path.join(zoomPath, xFolder);
      const stats = await collectFolderStats(folderPath);
      folderStats.push({
        name: xFolder,
        relativePath: `${zoom}/${xFolder}`,
        fileCount: stats.fileCount,
        totalBytes: stats.totalBytes,
        files: stats.files.map((file) => ({
          ...file,
          relativeObjectPath: `${destinationObjectRoot}/${zoom}/${xFolder}/${path
            .relative(folderPath, file.fullPath)
            .replace(/\\/g, "/")}`,
        })),
      });
    }

    const batchGroups = createTileBatches(folderStats, {
      maxGroupsPerBatch:
        tile.maxGroupsPerBatch ??
        job.batching?.maxGroupsPerBatch ??
        tileDefaults.maxGroupsPerBatch,
      maxFilesPerBatch:
        tile.maxFilesPerBatch ??
        job.batching?.maxFilesPerBatch ??
        tileDefaults.maxFilesPerBatch,
      maxBytesPerBatch:
        tile.maxBytesPerBatch ??
        job.batching?.maxBytesPerBatch ??
        tileDefaults.maxBytesPerBatch,
    });

    batchGroups.forEach((batchGroup, index) => {
      batches.push({
        id: buildBatchId([
          job.id,
          tile.tileFolder,
          `z${zoom}`,
          `batch-${String(index + 1).padStart(3, "0")}`,
        ]),
        kind: "tile-batch",
        tileFolder: tile.tileFolder,
        zoom,
        sourceRoot,
        objectRoot: destinationObjectRoot,
        relativeObjectRoot: `${destinationObjectRoot}/${zoom}`,
        groups: batchGroup.groups,
        fileCount: batchGroup.totalFiles,
        totalBytes: batchGroup.totalBytes,
      });
    });
  }

  return {
    kind: "tiles",
    alias: tile.destinationAlias ?? "tiles",
    tileFolder: tile.tileFolder,
    displayLabel: tile.displayLabel,
    sourceAlias: tile.sourceAlias,
    sourceRoot,
    destinationObjectRoot,
    batches,
  };
}

async function buildPointCloudTask({ job, pointCloud }) {
  const sourceFile = path.resolve(
    process.cwd(),
    pointCloud.sourceFile ??
      path.join(
        "public",
        "3d",
        job.clientCode,
        String(job.year),
        job.surveyId,
        pointCloud.file ?? "odm.pcd",
      ),
  );
  const stats = await statFile(sourceFile);
  const fileName = pointCloud.file ?? path.basename(sourceFile);
  const objectPath = cleanPathSegment(
    pointCloud.destinationObjectPath ??
      `${job.clientCode}/${job.year}/${job.surveyId}/point-clouds/${fileName}`,
  );

  return {
    id: buildBatchId([job.id, "point-cloud", fileName]),
    kind: "point-cloud",
    alias: pointCloud.destinationAlias ?? "pointclouds",
    displayLabel: pointCloud.displayLabel,
    sourceAlias: pointCloud.sourceAlias,
    sourceFile,
    fileName,
    objectPath,
    size: stats.size,
  };
}

async function buildJobPlan(job) {
  const tileDefaults = {
    maxGroupsPerBatch: 25,
    maxFilesPerBatch: 6500,
    maxBytesPerBatch: 175_000_000,
  };

  const tasks = [];
  for (const tile of job.tiles ?? []) {
    tasks.push(await buildTileTask({ job, tile, tileDefaults }));
  }

  if (job.pointCloud) {
    tasks.push(await buildPointCloudTask({ job, pointCloud: job.pointCloud }));
  }

  return {
    id: job.id,
    clientCode: job.clientCode,
    year: job.year,
    surveyId: job.surveyId,
    tasks,
  };
}

async function uploadFilesWithConcurrency(files, concurrency, worker) {
  const queue = [...files];
  const failures = [];
  const completed = [];

  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;

      try {
        completed.push(await worker(next));
      } catch (error) {
        failures.push({
          file: next,
          error: error.message,
        });
      }
    }
  });

  await Promise.all(runners);

  if (failures.length > 0) {
    const detail = failures
      .slice(0, 3)
      .map((failure) => `${failure.file.fullPath}: ${failure.error}`)
      .join("; ");
    throw new Error(
      `Batch upload failed for ${failures.length} file(s). ${detail}`,
    );
  }

  return completed;
}

function getPlanUnitIds(plan) {
  return plan.tasks.flatMap((task) => {
    if (task.kind === "tiles") {
      return task.batches.map((batch) => batch.id);
    }

    if (task.kind === "point-cloud") return [task.id];
    return [];
  });
}

function countJobUnits(plan) {
  return getPlanUnitIds(plan).length;
}

function countCompletedPlanUnits(plan, state) {
  const plannedUnitIds = new Set(getPlanUnitIds(plan));
  return [...new Set(state.completedBatchIds)].filter((id) =>
    plannedUnitIds.has(id),
  ).length;
}

function logBatchStart({
  jobId,
  completedUnits,
  totalUnits,
  unitLabel,
  fileCount,
  totalBytes,
}) {
  const percent = totalUnits > 0 ? ((completedUnits / totalUnits) * 100).toFixed(1) : "0.0";
  console.log(
    `[${jobId}] Starting ${unitLabel} | overall ${completedUnits}/${totalUnits} (${percent}%) | ${fileCount.toLocaleString()} files | ${formatBytes(totalBytes)}`,
  );
}

function logBatchProgress({
  jobId,
  unitLabel,
  completedFiles,
  totalFiles,
}) {
  const percent = totalFiles > 0 ? ((completedFiles / totalFiles) * 100).toFixed(1) : "0.0";
  console.log(
    `[${jobId}] ${unitLabel} progress ${completedFiles.toLocaleString()}/${totalFiles.toLocaleString()} files (${percent}%)`,
  );
}

function logBatchComplete({
  jobId,
  completedUnits,
  totalUnits,
  unitLabel,
}) {
  const percent = totalUnits > 0 ? ((completedUnits / totalUnits) * 100).toFixed(1) : "100.0";
  console.log(
    `[${jobId}] Completed ${unitLabel} | overall ${completedUnits}/${totalUnits} (${percent}%)`,
  );
}

async function runTileBatch({
  jobId,
  batch,
  alias,
  s3Config,
  apply,
  state,
  statePath,
  uploadConcurrency,
  progress,
}) {
  const unitLabel = `tile batch ${batch.id}`;

  if (apply && state.completedBatchIds.includes(batch.id)) {
    progress.completedUnits += 1;
    logBatchComplete({
      jobId,
      completedUnits: progress.completedUnits,
      totalUnits: progress.totalUnits,
      unitLabel: `${unitLabel} (already uploaded)`,
    });
    return {
      batchId: batch.id,
      status: "skipped-completed",
      fileCount: batch.fileCount,
      totalBytes: batch.totalBytes,
    };
  }

  const allFiles = batch.groups.flatMap((group) =>
    group.files.map((file) => ({
      ...file,
      objectPath: `${batch.objectRoot}/${path
        .relative(path.join(batch.sourceRoot, batch.zoom, group.name), file.fullPath)
        .replace(/\\/g, "/")}`,
      bucketKeyPath: `${batch.objectRoot}/${path
        .relative(path.join(batch.sourceRoot, batch.zoom, group.name), file.fullPath)
        .replace(/\\/g, "/")}`,
      xFolder: group.name,
    })),
  );

  const location = resolveStorageLocation(alias, batch.objectRoot);
  const preview = {
    batchId: batch.id,
    status: apply ? "pending-apply" : "planned",
    fileCount: batch.fileCount,
    totalBytes: batch.totalBytes,
    bucket: location.bucket,
    keyPrefix: location.key,
    zoom: batch.zoom,
    groups: batch.groups.map((group) => ({
      name: group.name,
      fileCount: group.fileCount,
      totalBytes: group.totalBytes,
    })),
  };

  if (!apply) {
    return preview;
  }

  logBatchStart({
    jobId,
    completedUnits: progress.completedUnits,
    totalUnits: progress.totalUnits,
    unitLabel,
    fileCount: allFiles.length,
    totalBytes: batch.totalBytes,
  });

  let completedFiles = 0;
  const progressStep = Math.max(1, Math.ceil(allFiles.length / 10));
  let nextProgressLog = progressStep;

  await uploadFilesWithConcurrency(allFiles, uploadConcurrency, async (file) => {
    const relativeUnderGroup = path
      .relative(path.join(batch.sourceRoot, batch.zoom, file.xFolder), file.fullPath)
      .replace(/\\/g, "/");
    const objectPath = `${batch.objectRoot}/${batch.zoom}/${file.xFolder}/${relativeUnderGroup}`;
    const resolved = resolveStorageLocation(alias, objectPath);
    const buffer = await fs.readFile(file.fullPath);
    const result = await s3PutObject({
      ...s3Config,
      bucket: resolved.bucket,
      key: resolved.key,
      buffer,
      contentType: inferContentType(file.fullPath),
    });

    completedFiles += 1;
    if (completedFiles >= nextProgressLog || completedFiles === allFiles.length) {
      logBatchProgress({
        jobId,
        unitLabel,
        completedFiles,
        totalFiles: allFiles.length,
      });
      nextProgressLog = Math.min(allFiles.length, nextProgressLog + progressStep);
    }

    return result;
  });

  state.completedBatchIds.push(batch.id);
  await writeJson(statePath, state);
  progress.completedUnits += 1;
  logBatchComplete({
    jobId,
    completedUnits: progress.completedUnits,
    totalUnits: progress.totalUnits,
    unitLabel,
  });

  return {
    ...preview,
    status: "uploaded",
  };
}

async function runPointCloudTask({
  jobId,
  task,
  s3Config,
  apply,
  state,
  statePath,
  progress,
}) {
  const unitLabel = `point cloud ${task.fileName}`;

  if (apply && state.completedBatchIds.includes(task.id)) {
    progress.completedUnits += 1;
    logBatchComplete({
      jobId,
      completedUnits: progress.completedUnits,
      totalUnits: progress.totalUnits,
      unitLabel: `${unitLabel} (already uploaded)`,
    });
    return {
      batchId: task.id,
      status: "skipped-completed",
      fileCount: 1,
      totalBytes: task.size,
      objectPath: task.objectPath,
    };
  }

  const location = resolveStorageLocation(task.alias, task.objectPath);
  const preview = {
    batchId: task.id,
    status: apply ? "pending-apply" : "planned",
    fileCount: 1,
    totalBytes: task.size,
    bucket: location.bucket,
    key: location.key,
    objectPath: task.objectPath,
  };

  if (!apply) {
    return preview;
  }

  logBatchStart({
    jobId,
    completedUnits: progress.completedUnits,
    totalUnits: progress.totalUnits,
    unitLabel,
    fileCount: 1,
    totalBytes: task.size,
  });

  const buffer = await fs.readFile(task.sourceFile);
  await s3PutObject({
    ...s3Config,
    bucket: location.bucket,
    key: location.key,
    buffer,
    contentType: inferContentType(task.sourceFile),
  });

  state.completedBatchIds.push(task.id);
  await writeJson(statePath, state);
  progress.completedUnits += 1;
  logBatchComplete({
    jobId,
    completedUnits: progress.completedUnits,
    totalUnits: progress.totalUnits,
    unitLabel,
  });

  return {
    ...preview,
    status: "uploaded",
  };
}

async function loadState(jobId) {
  const statePath = path.join(STATE_ROOT, `${safeFileLabel(jobId)}.json`);
  try {
    const state = await readJson(statePath);
    return { statePath, state };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return {
      statePath,
      state: {
        jobId,
        completedBatchIds: [],
      },
    };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const configPath = path.resolve(process.cwd(), args.config);
  const config = await readJson(configPath);

  const jobs = (config.jobs ?? []).filter((job) =>
    args.job ? job.id === args.job : true,
  );

  if (jobs.length === 0) {
    throw new Error("No matching jobs found in the config file.");
  }

  const connection = args.apply
    ? {
        endpoint: requireEnv("MINIO_S3_ENDPOINT"),
        accessKey: requireEnv("MINIO_ACCESS_KEY"),
        secretKey: requireEnv("MINIO_SECRET_KEY"),
        region: process.env.MINIO_REGION ?? "us-east-1",
      }
    : {
        endpoint: null,
        accessKey: null,
        secretKey: null,
        region: process.env.MINIO_REGION ?? "us-east-1",
      };

  const report = {
    createdAt: new Date().toISOString(),
    mode: args.apply ? "apply" : "dry-run",
    configPath,
    jobs: [],
  };

  for (const job of jobs) {
    const plan = await buildJobPlan(job);
    const { statePath, state } = await loadState(job.id);
    const uploadConcurrency = job.uploadConcurrency ?? config.defaults?.uploadConcurrency ?? 3;
    const manifestDefaults = getManifestDefaults(config, job);
    const tileFolderExpectations = buildTileFolderExpectations(plan);
    const tileFolderAuditSql = buildManifestTileFolderAuditSql(
      tileFolderExpectations,
    );
    const progress = {
      completedUnits: args.apply ? countCompletedPlanUnits(plan, state) : 0,
      totalUnits: countJobUnits(plan),
    };
    const jobReport = {
      id: plan.id,
      clientCode: plan.clientCode,
      surveyId: plan.surveyId,
      year: plan.year,
      uploadConcurrency,
      tileFolderExpectations,
      warnings: buildJobWarnings({ plan, tileFolderExpectations }),
      manifestEntryDrafts: [],
      tasks: [],
    };

    if (args.apply) {
      console.log(
        `[${plan.id}] Starting upload with ${progress.totalUnits} total unit(s) and ${progress.completedUnits} already completed.`,
      );
    }

    for (const task of plan.tasks) {
      if (task.kind === "tiles") {
        const batchResults = [];
        for (const batch of task.batches) {
          batchResults.push(
            await runTileBatch({
              jobId: plan.id,
              batch,
              alias: task.alias,
              s3Config: connection,
              apply: args.apply,
              state,
              statePath,
              uploadConcurrency,
              progress,
            }),
          );
        }

        jobReport.tasks.push({
          kind: "tiles",
          tileFolder: task.tileFolder,
          alias: task.alias,
          sourceRoot: task.sourceRoot,
          destinationObjectRoot: task.destinationObjectRoot,
          batchCount: task.batches.length,
          batches: batchResults,
        });
        jobReport.manifestEntryDrafts.push(
          buildTileManifestEntryDraft({ job: plan, task, manifestDefaults }),
        );
        continue;
      }

      if (task.kind === "point-cloud") {
        jobReport.manifestEntryDrafts.push(
          buildPointCloudManifestEntryDraft({
            job: plan,
            task,
            manifestDefaults,
          }),
        );
        jobReport.tasks.push({
          kind: "point-cloud",
          alias: task.alias,
          sourceFile: task.sourceFile,
          result: await runPointCloudTask({
            jobId: plan.id,
            task,
            s3Config: connection,
            apply: args.apply,
            state,
            statePath,
            progress,
          }),
        });
      }
    }

    jobReport.manifestInsertSql = buildManifestInsertSql({
      manifestIdPlaceholder: manifestDefaults.manifestIdPlaceholder,
      manifestEntryDrafts: jobReport.manifestEntryDrafts,
    });
    jobReport.orthoTileFolderAuditSql = tileFolderAuditSql;
    jobReport.sqlEditorReviewSql = buildManifestReviewSql({
      manifestInsertSql: jobReport.manifestInsertSql,
      tileFolderAuditSql,
    });

    if (args.apply) {
      console.log(
        `[${plan.id}] Upload finished ${progress.completedUnits}/${progress.totalUnits} unit(s).`,
      );
    }

    report.jobs.push(jobReport);
  }

  await ensureDirectory(REPORTS_ROOT);
  const reportPath = path.join(
    REPORTS_ROOT,
    `publish-protected-assets-${formatTimestamp()}.json`,
  );
  await writeJson(reportPath, report);

  console.log(
    `${args.apply ? "Apply" : "Dry-run"} complete. Report written to ${reportPath}`,
  );
}

main().catch((error) => {
  console.error("Protected asset publish failed:", error.message);
  process.exitCode = 1;
});

