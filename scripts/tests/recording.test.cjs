const { test } = require("node:test");
const assert = require("node:assert/strict");
const { verifyReport, parseJson, verifyUploadLog } = require("../lib/recording-catalog.cjs");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const limitsSource = ts.transpileModule(
  fs.readFileSync("lib/recording/limits.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const limits = {};
vm.runInNewContext(limitsSource, { exports: limits });
test("recording PCD limit is exactly 5 GiB", () => {
  assert.equal(limits.RECORDING_PCD_MAX_BYTES, 5 * 1024 ** 3);
  assert.equal(limits.RECORDING_PCD_MAX_LABEL, "5 GiB");
});
test("stderr audit accepts empty logs but rejects generic warnings and errors", () => {
  assert.equal(verifyUploadLog("wave", Buffer.alloc(0)).status, "empty");
  assert.throws(() => verifyUploadLog("wave", Buffer.from("Warning")));
  assert.throws(() => verifyUploadLog("workshop-organization-wave-001", Buffer.from("NodeVersionSupportWarning")));
});
test("reads PowerShell UTF-8 BOM status while rejecting malformed JSON", () => {
  assert.deepEqual(parseJson('\uFEFF{"pid":123}'), { pid: 123 });
  assert.throws(() => parseJson('\uFEFF{"pid":'));
});
function fixture(kind = "tiles") {
  const prefix = kind === "tiles" ? "demo/2026/AH-026001/ortho/round-corners" : "demo/2026/AH-026001/point-clouds/original-RGB.pcd";
  const bucket = kind === "tiles" ? "tiles" : "pointclouds";
  return {
    waveId: "wave", completedAt: "2026-09-29T00:00:00Z",
    capacityChecks: [{ allowed: true }],
    groups: [{ kind, surveyId: "AH-026001", verifiedObjects: 1, verifiedBytes: 10, objects: [
      { bucket, key: prefix + (kind === "tiles" ? "/1/1/1.png" : ""), size: 10, contentLength: 10, exists: true, verified: true },
    ] }],
    manifestEntries: [{ surveyId: "AH-026001", entryType: kind === "tiles" ? "tile_group" : "point_cloud",
      referenceKey: prefix, destinationStorageAlias: bucket,
      nginxRoutePattern: kind === "tiles" ? "/asimov-hawks/tiles/" + prefix + "/{z}/{x}/{y}.png" : "/asimov-hawks/3d/demo/2026/AH-026001/original-RGB.pcd" }],
    summary: { verifiedObjects: 1, verifiedBytes: 10 },
  };
}
test("verified TMS metadata preserves northward Y and actual zoom", () => {
  const tile = verifyReport(fixture(), "wave").entries[0].tile;
  assert.equal(tile.minZoom, 1); assert.equal(tile.maxZoom, 1);
  assert.equal(tile.bounds[0], 0); assert.equal(tile.bounds[1], 0);
  assert.equal(tile.bounds[2], 180); assert.ok(tile.bounds[3] > 85);
});
test("original PCD filename is preserved", () => {
  assert.match(verifyReport(fixture("point-cloud"), "wave").entries[0].cloud.url, /original-RGB\.pcd$/);
});
for (const [name, mutate] of [
  ["incomplete report", (r) => delete r.completedAt],
  ["denied capacity", (r) => r.capacityChecks[0].allowed = false],
  ["unverified object", (r) => r.groups[0].objects[0].verified = false],
  ["wrong object length", (r) => r.groups[0].objects[0].contentLength = 9],
  ["wrong summary", (r) => r.summary.verifiedBytes = 11],
  ["cross-survey route", (r) => r.manifestEntries[0].nginxRoutePattern = r.manifestEntries[0].nginxRoutePattern.replace("AH-026001", "AH-026002")],
  ["path outside verified prefix", (r) => r.groups[0].objects[0].key = "elsewhere/1/1/1.png"],
  ["invalid TMS coordinates", (r) => r.groups[0].objects[0].key = r.groups[0].objects[0].key.replace("/1/1/1.png", "/1/3/1.png")],
  ["wrong wave", (r) => r.waveId = "other"],
]) test("rejects " + name, () => { const report = fixture(); mutate(report); assert.throws(() => verifyReport(report, "wave")); });
