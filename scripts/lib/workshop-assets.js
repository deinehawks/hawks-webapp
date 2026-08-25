/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs/promises");
const path = require("node:path");

const PERMANENTLY_EXCLUDED_SURVEY_IDS = Object.freeze(["AH-026012", "AH-026013"]);
const DEFAULT_SOURCE_ROOT = "Z:\\surveys\\2026";
const MAX_SURVEYS_PER_WAVE = 3;
const MIN_CAPACITY_RESERVE_BYTES = 100 * 1024 ** 3;
const CAPACITY_RESERVE_RATIO = 0.15;
const TRANSFER_OVERHEAD_RATIO = 0.1;

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
  const surveyIds = new Set();

  for (const survey of approvedSurveys) {
    const surveyId = normalizeSurveyId(survey?.surveyId);
    if (!surveyId) errors.push("Every approved survey requires surveyId.");
    if (PERMANENTLY_EXCLUDED_SURVEY_IDS.includes(surveyId)) errors.push(`${surveyId} is permanently excluded from this workflow.`);
    if (surveyIds.has(surveyId)) errors.push(`${surveyId} appears more than once.`);
    if (!["round-corners", "sharp-corners"].includes(survey?.tileVariant)) errors.push(`${surveyId || "Survey"} requires a valid tileVariant.`);
    surveyIds.add(surveyId);
  }

  const keys = new Set();
  for (const item of approvedPointClouds) {
    const surveyId = normalizeSurveyId(item?.surveyId);
    const sourceFile = String(item?.sourceFile ?? "").trim();
    if (!surveyIds.has(surveyId)) errors.push(`${surveyId || "Point cloud"} is not an approved survey.`);
    if (!sourceFile.toLowerCase().endsWith(".pcd")) errors.push(`${surveyId || "Point cloud"} requires an explicit .pcd sourceFile.`);
    if (PERMANENTLY_EXCLUDED_SURVEY_IDS.includes(surveyId)) errors.push(`${surveyId} is permanently excluded from this workflow.`);
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
  return {
    errors,
    allowlist: {
      version: value.version ?? 1,
      sourceRoot: path.resolve(value.sourceRoot ?? DEFAULT_SOURCE_ROOT),
      datasetYear: Number(value.datasetYear ?? 2026),
      maxSurveysPerWave: maximum,
      approvedSurveys: approvedSurveys.map((item) => ({ ...item, surveyId: normalizeSurveyId(item.surveyId), includeTiles: item.includeTiles !== false })),
      approvedPointClouds: approvedPointClouds.map((item) => ({ ...item, surveyId: normalizeSurveyId(item.surveyId), sourceFile: path.resolve(item.sourceFile) })),
      ignoredPointClouds: ignoredPointClouds.map((item) => ({ ...item, surveyId: normalizeSurveyId(item.surveyId), sourceFile: path.resolve(item.sourceFile) })),
    },
  };
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

function createWaves(items, maximum = MAX_SURVEYS_PER_WAVE) {
  const waves = [];
  for (let index = 0; index < items.length; index += maximum) waves.push(items.slice(index, index + maximum));
  return waves;
}

function evaluateCapacity({ totalBytes, availableBytes, remainingBytes }) {
  const reserveBytes = Math.max(Math.ceil(totalBytes * CAPACITY_RESERVE_RATIO), MIN_CAPACITY_RESERVE_BYTES);
  const plannedBytesWithOverhead = Math.ceil(remainingBytes * (1 + TRANSFER_OVERHEAD_RATIO));
  const projectedAvailableBytes = availableBytes - plannedBytesWithOverhead;
  return { allowed: projectedAvailableBytes >= reserveBytes, totalBytes, availableBytes, remainingBytes, plannedBytesWithOverhead, reserveBytes, projectedAvailableBytes };
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

module.exports = { CAPACITY_RESERVE_RATIO, DEFAULT_SOURCE_ROOT, MAX_SURVEYS_PER_WAVE, MIN_CAPACITY_RESERVE_BYTES, PERMANENTLY_EXCLUDED_SURVEY_IDS, TRANSFER_OVERHEAD_RATIO, createWaves, discoverSurveySource, evaluateCapacity, findRgbRoots, isTemporaryDirectoryName, normalizeSurveyId, parseDfOutput, validateAllowlist };
