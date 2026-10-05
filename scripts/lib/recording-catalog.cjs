const assert = require("node:assert/strict");
const crypto = require("node:crypto");
function verifyUploadLog(waveId, bytes) {
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (bytes.length === 0) return { status: "empty", sha256 };
  // Accepted pilot warning, documented in the 2026-08-28 Wave 001 sign-off.
  if (waveId === "workshop-organization-wave-001" &&
      sha256 === "9851bc7baa7c23315a4983ebac4fe812ecfc941896dc8df99c9df50d3162c27d") {
    return { status: "accepted-historical-node-version-warning", sha256 };
  }
  throw new Error("Unreviewed upload stderr for " + waveId);
}
function parseJson(text) {
  // Windows PowerShell writes status.json with a UTF-8 byte-order mark.
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}
function verifyReport(report, expectedWave) {
  assert.equal(report.waveId, expectedWave, "Wrong wave report");
  assert.ok(report.completedAt && Number.isFinite(Date.parse(report.completedAt)), "Incomplete report");
  assert.ok(report.groups?.length && report.manifestEntries?.length, "Empty report");
  assert.equal(report.capacityChecks?.length, report.groups.length, "Missing capacity checks");
  assert.ok(report.capacityChecks.every((check) => check.allowed === true), "Capacity check failed");
  let objects = 0, bytes = 0;
  const entries = [];
  const uniqueObjects = new Set();
  for (const group of report.groups) {
    assert.ok(group.objects?.length, "Empty group");
    assert.equal(group.verifiedObjects, group.objects.length);
    let groupBytes = 0;
    for (const object of group.objects) {
      assert.ok(object.verified === true && object.exists === true, "Unverified object");
      assert.ok(Number.isSafeInteger(object.size) && object.size >= 0);
      assert.equal(object.contentLength, object.size, "Object size mismatch");
      const identity = object.bucket + "/" + object.key;
      assert.ok(!uniqueObjects.has(identity), "Duplicate object");
      uniqueObjects.add(identity);
      groupBytes += object.size;
    }
    assert.equal(groupBytes, group.verifiedBytes, "Group total mismatch");
    objects += group.objects.length;
    bytes += groupBytes;
    const first = group.objects[0];
    const matches = report.manifestEntries.filter((entry) => entry.surveyId === group.surveyId &&
      entry.destinationStorageAlias === first.bucket &&
      (group.kind === "tiles" ? entry.entryType === "tile_group" && first.key.startsWith(entry.referenceKey + "/") :
        entry.entryType === "point_cloud" && first.key === entry.referenceKey));
    assert.equal(matches.length, 1, "Missing or ambiguous manifest evidence");
    const entry = matches[0];
    assert.ok(!entries.some((item) => item.entry === entry), "Reused manifest entry");
    const root = entry.referenceKey.split("/");
    assert.equal(root[1], "2026");
    assert.equal(root[2], group.surveyId);
    assert.match(root[0], /^[a-zA-Z0-9_-]+$/);
    assert.match(group.surveyId, /^AH-\d+$/);
    if (group.kind === "tiles") {
      const variant = root[4];
      assert.equal(root.length, 5);
      assert.equal(root[3], "ortho");
      assert.ok(["round-corners", "sharp-corners"].includes(variant));
      assert.equal(entry.nginxRoutePattern, "/asimov-hawks/tiles/" + entry.referenceKey + "/{z}/{x}/{y}.png");
      let minZoom = 24, maxZoom = -1, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const object of group.objects) {
        assert.equal(object.bucket, first.bucket);
        assert.ok(object.key.startsWith(entry.referenceKey + "/"));
        const match = object.key.slice(entry.referenceKey.length + 1).match(/^(\d+)\/(\d+)\/(\d+)\.png$/);
        assert.ok(match, "Malformed tile key");
        const [z, x, y] = match.slice(1).map(Number);
        assert.ok(z >= 0 && z <= 24 && x >= 0 && y >= 0 && x < 2 ** z && y < 2 ** z, "Invalid tile coordinates");
        minZoom = Math.min(minZoom, z);
        if (z > maxZoom) { maxZoom = z; minX = minY = Infinity; maxX = maxY = -Infinity; }
        if (z === maxZoom) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
      }
      const n = 2 ** maxZoom;
      const lon = (x) => x / n * 360 - 180;
      // TMS Y grows northward; preserve the V2 scheme="tms" contract.
      const lat = (y) => Math.atan(Math.sinh(Math.PI * (2 * y / n - 1))) * 180 / Math.PI;
      entries.push({ entry, clientCode: root[0], tile: { url: entry.nginxRoutePattern, tileFolder: variant, minZoom, maxZoom, bounds: [lon(minX), lat(minY), lon(maxX + 1), lat(maxY + 1)] } });
    } else {
      assert.equal(group.kind, "point-cloud");
      assert.equal(group.objects.length, 1);
      assert.equal(root.length, 5);
      assert.equal(root[3], "point-clouds");
      assert.match(root[4], /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.pcd$/i);
      assert.equal(entry.nginxRoutePattern, "/asimov-hawks/3d/" + root.slice(0, 3).join("/") + "/" + root[4]);
      entries.push({ entry, clientCode: root[0], cloud: { url: entry.nginxRoutePattern, bytes: groupBytes } });
    }
  }
  assert.equal(entries.length, report.manifestEntries.length, "Unmatched manifest entries");
  assert.equal(objects, report.summary.verifiedObjects);
  assert.equal(bytes, report.summary.verifiedBytes);
  return { entries, objects, bytes };
}
module.exports = { verifyReport, parseJson, verifyUploadLog };
