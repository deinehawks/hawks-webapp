// Run only after all waves finish. Reads reports; never calls MinIO or Supabase.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { verifyReport, parseJson, verifyUploadLog } = require("./lib/recording-catalog.cjs");
const { source } = JSON.parse(fs.readFileSync(".recording/source.json", "utf8"));
const { surveyIds } = JSON.parse(fs.readFileSync(".recording/selection.json", "utf8"));
const waves = [["organization", 5], ["private", 6], ["additional", 10]].flatMap(([scope, count]) =>
  Array.from({ length: count }, (_, index) => "workshop-" + scope + "-wave-" + String(index + 1).padStart(3, "0")));
const root = path.join(source, ".tmp/workshop-assets");
const missing = waves.filter((wave) => !fs.existsSync(path.join(root, "verification", wave + ".verification.json")));
assert.equal(missing.length, 0, "Wait for all waves; missing: " + missing.join(", "));
const status = parseJson(fs.readFileSync(path.join(root, "runner/status.json"), "utf8"));
try { process.kill(status.pid, 0); throw new Error("Recorded uploader PID is still present; wait for runner shutdown."); }
catch (error) { if (error.code !== "ESRCH") throw error; }
const catalog = { version: 1, createdAt: new Date().toISOString(), reports: [], surveys: {} };
const seen = new Set();
let objects = 0, bytes = 0;
for (const wave of waves) {
  const reportText = fs.readFileSync(path.join(root, "verification", wave + ".verification.json"), "utf8");
  const report = parseJson(reportText);
  const result = verifyReport(report, wave);
  // Require empty stderr except the exact already-signed-off pilot warning.
  const stderr = path.join(path.dirname(report.configPath), "upload.error.log");
  const uploadLog = verifyUploadLog(wave, fs.readFileSync(stderr));
  const waveIds = new Set(result.entries.map((item) => item.entry.surveyId));
  for (const id of waveIds) {
    assert.ok(surveyIds.includes(id) && !seen.has(id), "Unexpected or repeated survey");
    seen.add(id);
    catalog.surveys[id] = { clientCode: "", clouds: [] };
  }
  for (const item of result.entries) {
    const record = catalog.surveys[item.entry.surveyId];
    assert.ok(!record.clientCode || record.clientCode === item.clientCode, "Client mismatch");
    record.clientCode = item.clientCode;
    if (item.tile) { assert.ok(!record.tile, "Multiple tile groups need explicit selection"); record.tile = item.tile; }
    if (item.cloud) record.clouds.push(item.cloud);
  }
  objects += result.objects; bytes += result.bytes;
  catalog.reports.push({ wave, sha256: crypto.createHash("sha256").update(reportText).digest("hex"),
    objects: result.objects, bytes: result.bytes, surveys: waveIds.size, uploadLog });
}
assert.equal(seen.size, 58);
assert.equal(objects, 3311283, "Unexpected combined object total");
assert.equal(bytes, 201134174000, "Unexpected combined byte total");
const target = ".recording/catalog.json";
catalog.summary = { objects, bytes, surveys: seen.size };
assert.ok(!fs.existsSync(target), "Existing catalog retained; review before replacing");
fs.writeFileSync(target, JSON.stringify(catalog, null, 2) + "\n", { flag: "wx" });
console.log("Verified 21 reports and 58 surveys; recording catalog generated. Manifest activation and output onboarding remain separate gates.");
