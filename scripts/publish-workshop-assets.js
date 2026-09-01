/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const fs = require("node:fs/promises");
const { createReadStream } = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { HeadObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const dotenv = require("dotenv");

const {
  evaluateCapacity,
  isTemporaryDirectoryName,
  parseDfOutput,
  validateJobManifestScope,
} = require("./lib/workshop-assets");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const execFileAsync = promisify(execFile);
const OUTPUT_ROOT = path.resolve(process.cwd(), ".tmp/workshop-assets");
const DEFAULT_STATE_ROOT = path.join(OUTPUT_ROOT, "state");

function parseArgs(argv) {
  const args = { config: null, lock: null, stop: null };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--config") args.config = path.resolve(argv[++index]);
    else if (argv[index] === "--lock") args.lock = path.resolve(argv[++index]);
    else if (argv[index] === "--stop") args.stop = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!args.config) throw new Error("--config is required.");
  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function clean(value) {
  return String(value).replace(/^\/+|\/+$/g, "");
}

function storageLocation(alias, objectPath) {
  const key = `PROTECTED_ASSET_STORAGE_${alias.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_ROOT`;
  const root = clean(process.env[key] ?? process.env.PROTECTED_ASSET_STORAGE_ROOT ?? alias);
  const [bucket, ...prefix] = root.split("/").filter(Boolean);
  if (!bucket) throw new Error(`No bucket configured for storage alias ${alias}.`);
  return { bucket, key: [...prefix, clean(objectPath)].filter(Boolean).join("/") };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = filePath + "." + process.pid + "." + Date.now() + ".tmp";
  try {
    await fs.writeFile(temporaryPath, JSON.stringify(value, null, 2) + "\n", "utf8");
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function readResumeState(filePath, waveId) {
  const emptyState = { waveId, completedObjects: {} };
  try {
    const state = await readJson(filePath);
    if (state.waveId !== waveId || !state.completedObjects || Array.isArray(state.completedObjects)) {
      throw new Error("Resume state does not match wave " + waveId + ".");
    }
    return state;
  } catch (error) {
    if (error.code === "ENOENT") return emptyState;
    if (error instanceof SyntaxError) {
      const contents = await fs.readFile(filePath, "utf8");
      if (!contents.trim()) return emptyState;
    }
    throw error;
  }
}

async function collectFiles(root, extension) {
  const files = [];
  const queue = [root];
  while (queue.length) {
    const directory = queue.shift();
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (isTemporaryDirectoryName(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) queue.push(fullPath);
      else if (entry.isFile() && fullPath.toLowerCase().endsWith(extension)) {
        const stats = await fs.stat(fullPath);
        files.push({ sourceFile: fullPath, size: stats.size });
      }
    }
  }
  return files;
}

function createClient() {
  return new S3Client({
    endpoint: requireEnv("MINIO_S3_ENDPOINT"),
    region: process.env.MINIO_REGION ?? "us-east-1",
    forcePathStyle: true,
    maxAttempts: 4,
    credentials: {
      accessKeyId: requireEnv("MINIO_ACCESS_KEY"),
      secretAccessKey: requireEnv("MINIO_SECRET_KEY"),
    },
  });
}

async function headObject(client, object) {
  try {
    const response = await client.send(new HeadObjectCommand({ Bucket: object.bucket, Key: object.key }));
    return { exists: true, contentLength: Number(response.ContentLength), etag: response.ETag ?? null };
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) return { exists: false };
    throw error;
  }
}

async function uploadObject(client, object, options) {
  const before = await headObject(client, object);
  if (before.exists) {
    if (before.contentLength !== object.size) throw new Error(`Existing object size mismatch for ${object.bucket}/${object.key}.`);
    return { status: "already-present", verified: true, ...before };
  }

  const upload = new Upload({
    client,
    queueSize: options.queueSize,
    partSize: options.partSize,
    leavePartsOnError: false,
    params: {
      Bucket: object.bucket,
      Key: object.key,
      Body: createReadStream(object.sourceFile),
      ContentLength: object.size,
      ContentType: object.contentType,
    },
  });
  await upload.done();
  const after = await headObject(client, object);
  if (!after.exists || after.contentLength !== object.size) throw new Error(`Remote verification failed for ${object.bucket}/${object.key}.`);
  return { status: "uploaded", verified: true, ...after };
}

async function mapConcurrent(items, concurrency, worker) {
  const queue = [...items];
  const results = [];
  let failure = null;
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length && !failure) {
      const item = queue.shift();
      if (!item) continue;
      try {
        results.push(await worker(item));
      } catch (error) {
        failure ??= error;
      }
    }
  });
  await Promise.all(runners);
  if (failure) throw failure;
  return results;
}

async function checkCapacity(remainingBytes) {
  const container = process.env.MINIO_DOCKER_CONTAINER ?? "hawks-minio";
  const dataPath = process.env.MINIO_DATA_PATH ?? "/data";
  const { stdout } = await execFileAsync("docker", ["exec", container, "df", "-B1", dataPath], { windowsHide: true });
  const result = evaluateCapacity({ ...parseDfOutput(stdout), remainingBytes });
  if (!result.allowed) throw new Error(`Capacity guard blocked the next batch: projected free bytes ${result.projectedAvailableBytes}, required reserve ${result.reserveBytes}.`);
  return result;
}

function validateConfig(config) {
  if (config.targetEnvironment !== "staging") throw new Error("Workshop asset uploads are restricted to staging.");
  if (config.workflowVersion !== 1 || config.reviewed !== true) throw new Error("Only a frozen, reviewed workflowVersion 1 config may be uploaded.");
  if (!config.capacityGuard?.enabled) throw new Error("Capacity guard must be enabled.");
  if (!Array.isArray(config.jobs) || !config.jobs.length || config.jobs.length > 3) throw new Error("A reviewed wave must contain one through three survey jobs.");
  for (const job of config.jobs) {
    const scopeError = validateJobManifestScope(job);
    if (scopeError) throw new Error(scopeError);
  }
}

async function buildGroups(config) {
  const groups = [];
  for (const job of config.jobs) {
    for (const tile of job.tiles ?? []) {
      const localFiles = await collectFiles(tile.sourceRoot, ".png");
      const objects = localFiles.map((file) => {
        const relative = path.relative(tile.sourceRoot, file.sourceFile).replace(/\\/g, "/");
        const objectPath = `${job.clientCode}/${job.year}/${job.surveyId}/ortho/${tile.tileFolder}/${relative}`;
        return { ...file, ...storageLocation(tile.destinationAlias ?? "tiles", objectPath), contentType: "image/png", kind: "tile", surveyId: job.surveyId, tileFolder: tile.tileFolder };
      });
      if (!objects.length) throw new Error(`${job.surveyId} has no PNG tiles in ${tile.sourceRoot}.`);
      groups.push({ id: `${job.id}-tiles-${tile.tileFolder}`, job, kind: "tiles", objects });
    }
    for (const pointCloud of job.pointClouds ?? []) {
      const stats = await fs.stat(pointCloud.sourceFile);
      const fileName = pointCloud.file ?? path.basename(pointCloud.sourceFile);
      const objectPath = pointCloud.destinationObjectPath ?? `${job.clientCode}/${job.year}/${job.surveyId}/point-clouds/${fileName}`;
      const object = { sourceFile: pointCloud.sourceFile, size: stats.size, ...storageLocation(pointCloud.destinationAlias ?? "pointclouds", objectPath), contentType: "application/octet-stream", kind: "point-cloud", surveyId: job.surveyId, fileName };
      groups.push({ id: `${job.id}-point-cloud-${fileName}`, job, kind: "point-cloud", objects: [object] });
    }
  }
  return groups;
}

function buildManifestEntries(config) {
  const entries = [];
  for (const job of config.jobs) {
    for (const tile of job.tiles ?? []) {
      const prefix = `${job.clientCode}/${job.year}/${job.surveyId}/ortho/${tile.tileFolder}`;
      entries.push({
        entryType: "tile_group",
        organizationId: job.manifest.organizationId,
        clientId: job.manifest.clientId,
        surveyId: job.surveyId,
        referenceKey: prefix,
        destinationStorageAlias: tile.destinationAlias ?? "tiles",
        nginxRoutePattern: `/asimov-hawks/tiles/${job.clientCode}/${job.year}/${job.surveyId}/ortho/${tile.tileFolder}/{z}/{x}/{y}.png`,
        protectionLevel: job.manifest.protectionLevel,
      });
    }
    for (const pointCloud of job.pointClouds ?? []) {
      const fileName = pointCloud.file ?? path.basename(pointCloud.sourceFile);
      const objectPath = pointCloud.destinationObjectPath ?? `${job.clientCode}/${job.year}/${job.surveyId}/point-clouds/${fileName}`;
      entries.push({
        entryType: "point_cloud",
        organizationId: job.manifest.organizationId,
        clientId: job.manifest.clientId,
        surveyId: job.surveyId,
        referenceKey: objectPath,
        destinationStorageAlias: pointCloud.destinationAlias ?? "pointclouds",
        nginxRoutePattern: `/asimov-hawks/3d/${job.clientCode}/${job.year}/${job.surveyId}/${fileName}`,
        protectionLevel: job.manifest.protectionLevel,
      });
    }
  }
  return entries;
}

async function main() {
  const args = parseArgs(process.argv);
  try {
    const config = await readJson(args.config);
    validateConfig(config);
    const manifestEntries = buildManifestEntries(config);
    const groups = await buildGroups(config);
    const client = createClient();
    const statePath = path.join(DEFAULT_STATE_ROOT, `${config.waveId}.json`);
    const state = await readResumeState(statePath, config.waveId);

    let remainingBytes = groups.flatMap((group) => group.objects).reduce((sum, object) => sum + object.size, 0);
    const report = { createdAt: new Date().toISOString(), configPath: args.config, waveId: config.waveId, groups: [], capacityChecks: [], manifestEntries, summary: { verifiedObjects: 0, verifiedBytes: 0 } };
    for (const group of groups) {
      if (args.stop) {
        try {
          await fs.access(args.stop);
          throw new Error(`Stop requested before batch ${group.id}; resumable state is preserved.`);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      const capacity = await checkCapacity(remainingBytes);
      report.capacityChecks.push({ groupId: group.id, ...capacity });
      const concurrency = group.kind === "tiles" ? Number(config.defaults?.uploadConcurrency ?? 3) : Number(config.defaults?.pointCloudQueueSize ?? 2);
      const results = await mapConcurrent(group.objects, concurrency, async (object) => {
        const result = await uploadObject(client, object, {
          queueSize: group.kind === "tiles" ? 1 : Number(config.defaults?.pointCloudQueueSize ?? 2),
          partSize: group.kind === "tiles" ? 8 * 1024 ** 2 : Number(config.defaults?.pointCloudPartSizeBytes ?? 64 * 1024 ** 2),
        });
        return { bucket: object.bucket, key: object.key, size: object.size, ...result };
      });
      for (const result of results) {
        state.completedObjects[`${result.bucket}/${result.key}`] = {
          size: result.size,
          etag: result.etag,
          verifiedAt: new Date().toISOString(),
        };
      }
      await writeJson(statePath, state);
      const verifiedBytes = results.reduce((sum, item) => sum + item.size, 0);
      report.groups.push({ id: group.id, kind: group.kind, surveyId: group.job.surveyId, verifiedObjects: results.length, verifiedBytes, objects: results });
      report.summary.verifiedObjects += results.length;
      report.summary.verifiedBytes += verifiedBytes;
      remainingBytes -= group.objects.reduce((sum, object) => sum + object.size, 0);
    }
    report.completedAt = new Date().toISOString();
    const reportPath = path.join(OUTPUT_ROOT, "verification", `${config.waveId}.verification.json`);
    await writeJson(reportPath, report);
    const entriesPath = path.join(OUTPUT_ROOT, "verification", `${config.waveId}.manifest-entries.json`);
    await writeJson(entriesPath, { waveId: config.waveId, completedAt: report.completedAt, entries: manifestEntries });
    console.log(`Verified ${report.summary.verifiedObjects} objects. Report: ${reportPath}`);
    console.log(`Verified manifest entries: ${entriesPath}`);
    console.log("No partial manifest SQL was generated. Build one combined draft only after every selected wave verifies.");
  } finally {
    if (args.lock) await fs.rm(args.lock, { force: true });
    if (args.stop) await fs.rm(args.stop, { force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Workshop asset upload failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildManifestEntries, readResumeState, validateConfig, writeJson };
