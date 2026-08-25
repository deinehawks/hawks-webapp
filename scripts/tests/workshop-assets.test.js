/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  createWaves,
  discoverSurveySource,
  evaluateCapacity,
  isTemporaryDirectoryName,
  parseDfOutput,
  validateAllowlist,
} = require("../lib/workshop-assets");

test("empty allowlist is valid and creates no work", () => {
  const result = validateAllowlist({ approvedSurveys: [] });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(createWaves(result.allowlist.approvedSurveys), []);
});

test("permanent exclusions fail closed", () => {
  const result = validateAllowlist({
    approvedSurveys: [{ surveyId: "AH-026012", tileVariant: "round-corners" }],
  });
  assert.match(result.errors.join(" "), /permanently excluded/);
});

test("waves never exceed three surveys", () => {
  assert.deepEqual(createWaves([1, 2, 3, 4, 5, 6, 7]), [[1, 2, 3], [4, 5, 6], [7]]);
});

test("temporary directories are recognized", () => {
  assert.equal(isTemporaryDirectoryName(".round-corners.tmp-abc"), true);
  assert.equal(isTemporaryDirectoryName("round-corners"), false);
});

test("capacity preserves reserve and transfer overhead", () => {
  const tebibyte = 1024 ** 4;
  assert.equal(evaluateCapacity({ totalBytes: tebibyte, availableBytes: 500 * 1024 ** 3, remainingBytes: 100 * 1024 ** 3 }).allowed, true);
  assert.equal(evaluateCapacity({ totalBytes: tebibyte, availableBytes: 200 * 1024 ** 3, remainingBytes: 100 * 1024 ** 3 }).allowed, false);
});

test("df output is parsed as bytes", () => {
  assert.deepEqual(parseDfOutput("Filesystem 1B-blocks Used Available Use% Mounted on\n/dev/sda 1000 100 900 10% /data"), { totalBytes: 1000, availableBytes: 900 });
});

test("direct and nested rgb layouts are discovered", async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hawks-assets-"));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [surveyId, middle] of [["AH-TEST-1", []], ["AH-TEST-2", ["inner"]]]) {
    const rgb = path.join(root, surveyId, ...middle, "rgb");
    await fs.mkdir(path.join(rgb, "tiles", "ortho", "round-corners", "12"), { recursive: true });
    const result = await discoverSurveySource(root, surveyId, "round-corners");
    assert.equal(result.status, "ready");
    assert.deepEqual(result.zoomDirectories, ["12"]);
  }
});
