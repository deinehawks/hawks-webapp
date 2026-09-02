/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_SOURCE_ROOT = "Z:\\surveys\\2026";
const MAX_SURVEYS_PER_WAVE = 3;
const MIN_CAPACITY_RESERVE_BYTES = 20 * 1024 ** 3;
const CAPACITY_RESERVE_RATIO = 0.05;
const TRANSFER_OVERHEAD_RATIO = 0.1;
const DATASET_SCOPES = Object.freeze(["organization", "private"]);

function normalizeSurveyId(value) {
  return String(value ?? "").trim().toUpperCase();
}

function isTemporaryDirectoryName(name) {
  return /^\./.test(name) || /\.tmp(?:-|$)/i.test(name) || /temporary/i.test(name);
}

function validateAllowlist(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { errors: ["Allowlist must be a JSON object."], allowlist: null };
  }
  const errors = [];
  const approvedSurveys = Array.isArray(value.approvedSurveys) ? value.approvedSurveys : [];
  const approvedPointClouds = Array.isArray(value.approvedPointClouds) ? value.approvedPointClouds : [];
  const ignoredPointClouds = Array.isArray(value.ignoredPointClouds) ? value.ignoredPointClouds : [];
  const pilotSurveyIds = Array.isArray(value.pilotSurveyIds) ? value.pilotSurveyIds.map(normalizeSurveyId) : [];
  const surveyIds = new Set();

  for (const survey of approvedSurveys) {
    const surveyId = normalizeSurveyId(survey?.surveyId);
    if (!surveyId) errors.push("Every approved survey requires surveyId.");
    if (surveyIds.has(surveyId)) errors.push(`${surveyId} appears more than once.`);
    if (!["round-corners", "sharp-corners"].includes(survey?.tileVariant)) errors.push(`${surveyId || "Survey"} requires a valid tileVariant.`);
    if (!DATASET_SCOPES.includes(survey?.scope)) errors.push(`${surveyId || "Survey"} requires scope organization or private.`);
    surveyIds.add(surveyId);
  }

  const keys = new Set();
  for (const item of approvedPointClouds) {
    const surveyId = normalizeSurveyId(item?.surveyId);
    const sourceFile = String(item?.sourceFile ?? "").trim();
    if (!surveyIds.has(surveyId)) errors.push(`${surveyId || "Point cloud"} is not an approved survey.`);
    if (!sourceFile.toLowerCase().endsWith(".pcd")) errors.push(`${surveyId || "Point cloud"} requires an explicit .pcd sourceFile.`);
    const key = `${surveyId}|${path.resolve(sourceFile).toLowerCase()}`;
    if (keys.has(key)) errors.push(`Duplicate approved point cloud: ${sourceFile}.`);
    keys.add(key);
  }
  for (const item of ignoredPointClouds) {
    if (!normalizeSurveyId(item?.surveyId) || !String(item?.sourceFile ?? "").trim()) errors.push("Every ignored point cloud requires surveyId and sourceFile.");
    if (!String(item?.reason ?? "").trim()) errors.push("Every ignored point cloud requires a reason.");
    if (!String(item?.reviewDate ?? "").trim()) errors.push("Every ignored point cloud requires a reviewDate.");
  }

  const maximum = Number(value.maxSurveysPerWave ?? MAX_SURVEYS_PER_WAVE);
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > MAX_SURVEYS_PER_WAVE) errors.push("maxSurveysPerWave must be from 1 through 3.");
  if (value.pilotSurveyIds !== undefined && !Array.isArray(value.pilotSurveyIds)) errors.push("pilotSurveyIds must be an array.");
  if (pilotSurveyIds.some((surveyId) => !surveyId)) errors.push("Every pilotSurveyIds entry must be a survey ID.");
  if (new Set(pilotSurveyIds).size !== pilotSurveyIds.length) errors.push("pilotSurveyIds must not contain duplicates.");
  for (const surveyId of pilotSurveyIds) {
    if (!surveyIds.has(surveyId)) errors.push(`${surveyId} is a pilot but is not an approved survey.`);
  }
  if (Number.isInteger(maximum) && pilotSurveyIds.length > maximum) errors.push("pilotSurveyIds cannot exceed maxSurveysPerWave.");
  const batchKey = String(value.batchKey ?? "workshop").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(batchKey)) errors.push("batchKey must be a short lowercase kebab-case identifier.");
  return {
    errors,
    allowlist: {
      version: value.version ?? 1,
      sourceRoot: path.resolve(value.sourceRoot ?? DEFAULT_SOURCE_ROOT),
      datasetYear: Number(value.datasetYear ?? 2026),
      batchKey,
      maxSurveysPerWave: maximum,
      pilotSurveyIds,
      approvedSurveys: approvedSurveys.map((item) => ({ ...item, surveyId: normalizeSurveyId(item?.surveyId), includeTiles: item?.includeTiles !== false })),
      approvedPointClouds: approvedPointClouds.map((item) => {
        const sourceFile = String(item?.sourceFile ?? "").trim();
        return { ...item, surveyId: normalizeSurveyId(item?.surveyId), sourceFile: sourceFile ? path.resolve(sourceFile) : "" };
      }),
      ignoredPointClouds: ignoredPointClouds.map((item) => {
        const sourceFile = String(item?.sourceFile ?? "").trim();
        return { ...item, surveyId: normalizeSurveyId(item?.surveyId), sourceFile: sourceFile ? path.resolve(sourceFile) : "" };
      }),
    },
  };
}

function resolveDatasetScope(row) {
  if (!row) return { error: "Survey row is missing from staging." };
  if (!row.client_id || !row.client_code) return { error: "Survey has no canonical client relationship." };

  const organizationMappingCount = Number(row.organization_mapping_count ?? 0);
  const personMappingCount = Number(row.person_mapping_count ?? 0);
  const surveyOrganizationCount = Number(row.survey_organization_count ?? 0);
  const expectedSurveyOrganizationCount = Number(row.expected_survey_organization_count ?? 0);

  if (row.classification_kind === "organization") {
    if (organizationMappingCount !== 1 || !row.organization_id) return { error: "Organization client requires exactly one confirmed primary organization mapping." };
    if (personMappingCount !== 0) return { error: "Organization client has an ambiguous confirmed primary person mapping." };
    if (row.organization_status !== "active") return { error: "Mapped organization is not active." };
    if (surveyOrganizationCount !== 1 || expectedSurveyOrganizationCount !== 1) return { error: "Organization survey requires exactly one confirmed relationship to its mapped organization." };
    return {
      scope: "organization",
      protectionLevel: "organization",
      organizationId: row.organization_id,
      clientId: row.client_id,
    };
  }

  if (row.classification_kind === "individual") {
    if (personMappingCount !== 1 || !row.person_id) return { error: "Individual client requires exactly one confirmed primary person mapping." };
    if (organizationMappingCount !== 0 || row.organization_id) return { error: "Individual client has an ambiguous confirmed primary organization mapping." };
    if (surveyOrganizationCount !== 0) return { error: "Individual survey must not have an organization relationship." };
    return {
      scope: "private",
      protectionLevel: "private",
      organizationId: null,
      clientId: row.client_id,
    };
  }

  return { error: "Client classification must be organization or individual." };
}

function validateJobManifestScope(job) {
  if (!job?.manifest?.clientId) return `${job?.surveyId ?? "Survey"} is missing a reviewed manifest client.`;
  if (job.manifest.protectionLevel === "organization") {
    if (!job.manifest.organizationId) return `${job.surveyId} organization scope requires organizationId.`;
    return null;
  }
  if (job.manifest.protectionLevel === "private") {
    if (job.manifest.organizationId !== null) return `${job.surveyId} private scope requires a null organizationId.`;
    return null;
  }
  return `${job.surveyId} requires protectionLevel organization or private.`;
}

async function findRgbRoots(surveyRoot, maxDepth = 3) {
  const found = [];
  const queue = [{ directory: surveyRoot, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    let entries;
    try {
      entries = await fs.readdir(current.directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || isTemporaryDirectoryName(entry.name)) continue;
      const fullPath = path.join(current.directory, entry.name);
      if (entry.name.toLowerCase() === "rgb") found.push(fullPath);
      else if (current.depth < maxDepth) queue.push({ directory: fullPath, depth: current.depth + 1 });
    }
  }
  return found;
}

async function discoverSurveySource(sourceRoot, surveyId, tileVariant) {
  const surveyRoot = path.join(sourceRoot, surveyId);
  const rgbRoots = await findRgbRoots(surveyRoot);
  if (rgbRoots.length !== 1) {
    const reason = rgbRoots.length ? `Multiple rgb directories found beneath ${surveyRoot}.` : `No rgb directory found beneath ${surveyRoot}.`;
    return { status: "blocked", reason, surveyRoot, rgbRoots };
  }
  const rgbRoot = rgbRoots[0];
  const tileRoot = path.join(rgbRoot, "tiles", "ortho", tileVariant);
  let entries = [];
  try {
    entries = await fs.readdir(tileRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const zoomDirectories = entries.filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name) && !isTemporaryDirectoryName(entry.name)).map((entry) => entry.name).sort((a, b) => Number(a) - Number(b));
  if (!zoomDirectories.length) return { status: "blocked", reason: `No numeric tile zoom directories found at ${tileRoot}.`, surveyRoot, rgbRoot, tileRoot };
  return { status: "ready", surveyRoot, rgbRoot, tileRoot, zoomDirectories };
}

function createWaves(items, maximum = MAX_SURVEYS_PER_WAVE, pilotSurveyIds = []) {
  const waves = [];
  const pilotSet = new Set(pilotSurveyIds);
  if (pilotSet.size) {
    const itemsBySurveyId = new Map(items.map((item) => [normalizeSurveyId(item?.surveyId), item]));
    waves.push(pilotSurveyIds.map((surveyId) => itemsBySurveyId.get(surveyId)));
  }
  const remaining = pilotSet.size ? items.filter((item) => !pilotSet.has(normalizeSurveyId(item?.surveyId))) : items;
  for (let index = 0; index < remaining.length; index += maximum) waves.push(remaining.slice(index, index + maximum));
  return waves;
}

function evaluateCapacity({
  totalBytes,
  availableBytes,
  remainingBytes,
  reserveRatio = CAPACITY_RESERVE_RATIO,
  minimumReserveBytes = MIN_CAPACITY_RESERVE_BYTES,
  transferOverheadRatio = TRANSFER_OVERHEAD_RATIO,
}) {
  const reserveBytes = Math.max(Math.ceil(totalBytes * reserveRatio), minimumReserveBytes);
  const plannedBytesWithOverhead = Math.ceil(remainingBytes * (1 + transferOverheadRatio));
  const projectedAvailableBytes = availableBytes - plannedBytesWithOverhead;
  return { allowed: projectedAvailableBytes >= reserveBytes, totalBytes, availableBytes, remainingBytes, plannedBytesWithOverhead, reserveBytes, projectedAvailableBytes };
}

function validateCapacityGuard(guard) {
  if (!guard) return 'Capacity guard must be enabled.';
  if (!guard.enabled) return 'Capacity guard must be enabled.';
  if (guard.reserveRatio !== CAPACITY_RESERVE_RATIO) return 'Capacity guard reserve ratio is stale.';
  if (guard.minimumReserveBytes !== MIN_CAPACITY_RESERVE_BYTES) return 'Capacity guard minimum reserve is stale.';
  if (guard.transferOverheadRatio !== TRANSFER_OVERHEAD_RATIO) return 'Capacity guard transfer overhead is stale.';
  return null;
}

function parseDfOutput(output) {
  const lines = String(output).trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("MinIO capacity command returned no data row.");
  const columns = lines.at(-1).trim().split(/\s+/);
  const totalBytes = Number(columns[1]);
  const availableBytes = Number(columns[3]);
  if (!Number.isFinite(totalBytes) || !Number.isFinite(availableBytes)) throw new Error("Could not parse MinIO capacity output.");
  return { totalBytes, availableBytes };
}

module.exports = { CAPACITY_RESERVE_RATIO, DATASET_SCOPES, DEFAULT_SOURCE_ROOT, MAX_SURVEYS_PER_WAVE, MIN_CAPACITY_RESERVE_BYTES, TRANSFER_OVERHEAD_RATIO, createWaves, discoverSurveySource, evaluateCapacity, findRgbRoots, isTemporaryDirectoryName, normalizeSurveyId, parseDfOutput, resolveDatasetScope, validateAllowlist, validateCapacityGuard, validateJobManifestScope };
