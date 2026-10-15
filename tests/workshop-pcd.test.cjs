const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { PCDLoader } = require("three-stdlib");
const { convertWorkshopPcd } = require("../scripts/prepare-workshop-pcd.cjs");

function fixture(count = 7) {
  const header = Buffer.from([
    "VERSION 0.7", "FIELDS x y z red green blue", "SIZE 4 4 4 8 8 8",
    "TYPE F F F F F F", "COUNT 1 1 1 1 1 1", "WIDTH " + count, "HEIGHT 1",
    "VIEWPOINT 0 0 0 1 0 0 0", "POINTS " + count, "DATA binary", "",
  ].join("\r\n"));
  const body = Buffer.alloc(count * 36);
  for (let i = 0; i < count; i++) {
    [800000 + i, 837000 + i * 2, 20 + i].forEach((v, axis) => body.writeFloatLE(v, i * 36 + axis * 4));
    [10 + i, 100 + i, 200 + i].forEach((v, c) => body.writeDoubleLE(v, i * 36 + 12 + c * 8));
  }
  return { header, body, bytes: Buffer.concat([header, body]) };
}

async function workspace(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "workshop-pcd-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { input: path.join(root, "source.pcd"), output: path.join(root, "preview.pcd") };
}

function parse(bytes) {
  return new PCDLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length), "preview.pcd");
}

test("CRLF/double-RGB export becomes a correctly colored, evenly sampled loader-compatible PCD", async (t) => {
  const { input, output } = await workspace(t);
  const original = fixture();
  await fs.writeFile(input, original.bytes);
  const report = await convertWorkshopPcd(input, output, 3);
  assert.equal(report.sourcePoints, 7);
  assert.equal(report.outputPoints, 3);
  assert.deepEqual(report.bounds, { min: [800000, 837000, 20], max: [800006, 837012, 26] });
  assert.deepEqual(await fs.readFile(input), original.bytes);
  const cloud = parse(await fs.readFile(output));
  t.after(() => { cloud.geometry.dispose(); cloud.material.dispose(); });
  const positions = cloud.geometry.getAttribute("position");
  const colors = cloud.geometry.getAttribute("color");
  assert.equal(positions.count, 3);
  assert.equal(colors.count, 3);
  for (const [outIndex, sourceIndex] of [0, 3, 6].entries()) {
    assert.equal(positions.getX(outIndex), 800000 + sourceIndex);
    assert.equal(positions.getY(outIndex), 837000 + sourceIndex * 2);
    assert.equal(positions.getZ(outIndex), 20 + sourceIndex);
    assert.ok(Math.abs(colors.getX(outIndex) - (10 + sourceIndex) / 255) < 1e-6);
    assert.ok(Math.abs(colors.getY(outIndex) - (100 + sourceIndex) / 255) < 1e-6);
    assert.ok(Math.abs(colors.getZ(outIndex) - (200 + sourceIndex) / 255) < 1e-6);
  }
});

test("small exports retain every point and existing output/source paths are never overwritten", async (t) => {
  const { input, output } = await workspace(t);
  const original = fixture(2);
  await fs.writeFile(input, original.bytes);
  const report = await convertWorkshopPcd(input, output, 100);
  assert.equal(report.outputPoints, 2);
  const preview = await fs.readFile(output);
  await assert.rejects(convertWorkshopPcd(input, output, 2), { code: "EEXIST" });
  await assert.rejects(convertWorkshopPcd(input, input, 2), { code: "EEXIST" });
  assert.deepEqual(await fs.readFile(output), preview);
  assert.deepEqual(await fs.readFile(input), original.bytes);
});

test("truncated or unsupported sources fail before creating output", async (t) => {
  const { input, output } = await workspace(t);
  const original = fixture();
  await fs.writeFile(input, original.bytes.subarray(0, original.bytes.length - 1));
  await assert.rejects(convertWorkshopPcd(input, output, 3), /payload length/);
  await assert.rejects(fs.stat(output), { code: "ENOENT" });
  await fs.writeFile(input, Buffer.concat([Buffer.from(original.header.toString().replace("red green blue", "rxx green blue")), original.body]));
  await assert.rejects(convertWorkshopPcd(input, output, 3), /Unsupported source layout/);
  await assert.rejects(fs.stat(output), { code: "ENOENT" });
});

test("invalid sampled coordinates/colors remove only the incomplete new output", async (t) => {
  const { input, output } = await workspace(t);
  for (const invalidCoordinate of [false, true]) {
    const original = fixture();
    if (invalidCoordinate) original.bytes.writeFloatLE(NaN, original.header.length);
    else original.bytes.writeDoubleLE(300, original.header.length + 12);
    await fs.writeFile(input, original.bytes);
    await assert.rejects(convertWorkshopPcd(input, output, 3), invalidCoordinate ? /Non-finite coordinates/ : /Invalid RGB/);
    await assert.rejects(fs.stat(output), { code: "ENOENT" });
    assert.deepEqual(await fs.readFile(input), original.bytes);
  }
});
