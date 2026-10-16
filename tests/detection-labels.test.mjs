import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import * as detectionLabels from "../lib/helpers/detection-labels.ts";
const { HEALTHY_BANANA_LABEL, INFECTED_BANANA_LABEL, normalizeDetectionLabels,
  COCONUT_TREE_LABEL, countPlantDetections, filterPlantDetections, getDetectionPlantType,
  getDetectionPlantName, resolveDetectionFilter } = detectionLabels;

test("healthy labels accept hyphens, spaces, capitalization, and repeated whitespace", () => {
  const labels = [
    HEALTHY_BANANA_LABEL,
    "Banana Plant (Healthy Looking)",
    "Banana  Plant (Healthy-looking)",
    " banana  plant (healthy looking) ",
    "Banana Plant (Healthy - Looking)",
  ];
  assert.deepEqual(normalizeDetectionLabels(labels.map((label) => ({ label }))).map((row) => row.label),
    labels.map(() => HEALTHY_BANANA_LABEL));
});

test("normalization preserves source records, metadata and unrelated or missing labels", () => {
  const bbox = { min_lon: 125, max_lon: 126, min_lat: 7, max_lat: 8 };
  const input = [
    { label: "Banana Plant (Healthy Looking)", pairId: "healthy", areaCode: "AH-026010", bbox },
    { label: "Banana Plant (Infected)" },
    { label: "Banana Plant (Unknown)" },
    { label: "Coconut (Healthy Looking)" },
    { label: "Banana Plant (Healthy Looking) extra" },
    { label: null }, { areaCode: "missing-label" }, null,
  ];
  const before = structuredClone(input);
  const result = normalizeDetectionLabels(input);
  assert.deepEqual(input, before);
  assert.notEqual(result[0], input[0]);
  assert.equal(result[0].label, HEALTHY_BANANA_LABEL);
  assert.equal(result[0].pairId, "healthy");
  assert.equal(result[0].areaCode, "AH-026010");
  assert.equal(result[0].bbox, bbox);
  for (let i = 1; i < input.length; i++) assert.equal(result[i], input[i]);
  assert.deepEqual(normalizeDetectionLabels(result), result, "normalization is idempotent");
});

test("mixed JSON formats feed existing point/line overlays and counts without losing detections", () => {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const source = fs.readFileSync("lib/helpers/geometry.tsx", "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const geometry = {};
  new Function("require", "exports", compiled)((name) => name === "@/lib/types"
    ? { GeometryType: { Point: "Point", LineString: "LineString" } }
    : name === "./detection-labels" ? detectionLabels : require(name), geometry);
  const bbox = { min_lon: 125, max_lon: 126, min_lat: 7, max_lat: 8 };
  const input = [
    { label: HEALTHY_BANANA_LABEL, pairId: "old", areaCode: "AH-026010", bbox },
    { label: "Banana Plant (Healthy Looking)", pairId: "new", areaCode: "AH-026010", bbox },
    { label: "Banana Plant (Infected)", pairId: "infected", areaCode: "AH-026010", bbox },
    { label: "Banana  Plant (Unhealthy looking)", pairId: "unhealthy", areaCode: "AH-026010", bbox },
  ];
  const objects = normalizeDetectionLabels(input);
  assert.equal(objects.filter((o) => o.label === HEALTHY_BANANA_LABEL).length, 2);
  assert.equal(objects.filter((o) => o.label.includes("Healthy-looking")).length, 2);
  const points = geometry.generateFeatureCollection("Point", HEALTHY_BANANA_LABEL, objects);
  assert.deepEqual(points.features.map((feature) => feature.properties.pairId), ["old", "new"]);
  assert.deepEqual(points.features[0].geometry.coordinates, [125.5, 7.5]);
  assert.equal(geometry.generateFeatureCollection("LineString", HEALTHY_BANANA_LABEL, objects).features.length, 8);
  const unhealthyPoints = geometry.generateFeatureCollection("Point", INFECTED_BANANA_LABEL, objects);
  assert.deepEqual(unhealthyPoints.features.map((feature) => feature.properties.pairId), ["infected", "unhealthy"]);
  assert.equal(geometry.generateFeatureCollection("LineString", INFECTED_BANANA_LABEL, objects).features.length, 8);
  assert.equal(objects.filter((o) => o.label.includes("Infected")).length, 2);
});


test("unhealthy-looking aliases map to infected and never match the healthy class", () => {
  const labels = [
    "Banana  Plant (Unhealthy looking)",
    "Banana Plant (Unhealthy Looking)",
    "Banana Plant (Unhealthy-looking)",
    " banana  plant (UNHEALTHY - LOOKING) ",
    "Banana  Plant (infected)",
    INFECTED_BANANA_LABEL,
  ];
  const input = labels.map((label, index) => ({ label, pairId: String(index) }));
  const original = structuredClone(input);
  const normalized = normalizeDetectionLabels(input);
  assert.deepEqual(normalized.map((row) => row.label), labels.map(() => INFECTED_BANANA_LABEL));
  assert.equal(normalized.filter((row) => row.label === HEALTHY_BANANA_LABEL).length, 0);
  assert.deepEqual(input, original);
  assert.deepEqual(normalized.map((row) => row.pairId), input.map((row) => row.pairId));
});

test("coconut trees are inventory-only, counted separately, and never treated as unhealthy bananas", () => {
  const input = [
    { label: "Coconut Tree", areaCode: "AH-026132", pairId: "1" },
    { label: " coconut  TREE ", areaCode: "AH-026128", pairId: "1" },
    { label: "Banana Plant (Healthy Looking)", pairId: "2" },
    { label: "Banana Plant (Unhealthy looking)", pairId: "3" },
    { label: "Coconut (Healthy Looking)", pairId: "unknown" },
  ];
  const original = structuredClone(input);
  const normalized = normalizeDetectionLabels(input);
  assert.equal(normalized[1].label, COCONUT_TREE_LABEL);
  assert.deepEqual(input, original);
  assert.deepEqual(countPlantDetections(normalized), { healthy: 1, unhealthy: 1, banana: 2, coconut: 2, total: 4 });
  assert.equal(getDetectionPlantType(COCONUT_TREE_LABEL), "coconut");
  assert.equal(getDetectionPlantType("Coconut (Healthy Looking)"), null);
  assert.equal(getDetectionPlantName(COCONUT_TREE_LABEL), "Coconut");
  assert.equal(getDetectionPlantName(HEALTHY_BANANA_LABEL), "Banana");
  assert.deepEqual(filterPlantDetections(normalized, "coconut", "inventory"), normalized.slice(0, 2));
  assert.deepEqual(filterPlantDetections(normalized, "banana", "inventory"), normalized.slice(2, 4));
  assert.equal(filterPlantDetections(normalized, "all", "inventory").length, 4);
  assert.deepEqual(filterPlantDetections(normalized, "all", "analysis"), normalized.slice(2, 4));
  assert.deepEqual(filterPlantDetections(normalized, "healthy", "analysis"), [normalized[2]]);
  assert.deepEqual(filterPlantDetections(normalized, "unhealthy", "analysis"), [normalized[3]]);
  assert.deepEqual(filterPlantDetections(normalized, "none", "inventory"), []);
  assert.deepEqual(countPlantDetections([]), { healthy: 0, unhealthy: 0, banana: 0, coconut: 0, total: 0 });
});

test("switching modes or surveys resolves incompatible filters without assigning health to coconut", () => {
  assert.equal(resolveDetectionFilter("coconut", "analysis", true), "all");
  assert.equal(resolveDetectionFilter("banana", "analysis", true), "all");
  assert.equal(resolveDetectionFilter("healthy", "inventory", true), "all");
  assert.equal(resolveDetectionFilter("unhealthy", "inventory", true), "all");
  assert.equal(resolveDetectionFilter("coconut", "inventory", false), "all");
  assert.equal(resolveDetectionFilter("coconut", "inventory", true), "coconut");
  assert.equal(resolveDetectionFilter("none", "inventory", true), "none");
});
