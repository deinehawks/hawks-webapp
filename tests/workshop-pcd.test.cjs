const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { PCDLoader } = require("three-stdlib");
const { convertWorkshopPcd } = require("../scripts/prepare-workshop-pcd.cjs");
const ts = require("typescript");
const loaderExports = {};
new Function("require", "exports", ts.transpileModule(require("node:fs").readFileSync("lib/loaders/pcd-loader.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(require, loaderExports);
const { WorkshopPCDLoader } = loaderExports;
const performanceExports = {};
new Function("require", "exports", ts.transpileModule(require("node:fs").readFileSync("lib/three/point-cloud-performance.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(require, performanceExports);
const { createMovingPointIndex, createPointCloudPresentation, createPointCloudMotion, MOVING_POINT_BUDGET, POINT_CLOUD_RENDERER } = performanceExports;
const { BufferAttribute, BufferGeometry, Points, PointsMaterial, Vector3 } = require("three");

function cloudFixture(count = 20) {
  const positions = new Float32Array(count * 3), colors = new Uint8Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions.set([800000 + i, 837000 + i * 2, 20 + i], i * 3);
    colors.set([i, 70, 200], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3, true));
  geometry.computeBoundingSphere();
  return new Points(geometry, new PointsMaterial({ vertexColors: true }));
}

function timerFixture() {
  const timers = [];
  return {
    timers,
    schedule(callback, delay) { const timer = { callback, delay, canceled: false }; timers.push(timer); return () => { timer.canceled = true; }; },
    flush() { for (const timer of timers.splice(0)) if (!timer.canceled) timer.callback(); },
  };
}

test("motion indices cover the whole survey without duplicates and leave smaller clouds at full detail", () => {
  assert.equal(MOVING_POINT_BUDGET, 2_000_000);
  const index = createMovingPointIndex(10_000_000);
  assert.equal(index.count, MOVING_POINT_BUDGET);
  assert.equal(index.getX(0), 0); assert.equal(index.getX(index.count - 1), 9_999_999);
  for (let i = 1; i < index.count; i++) assert.ok(index.getX(i) > index.getX(i - 1));
  assert.deepEqual([...createMovingPointIndex(11, 4).array], [0, 3, 6, 10]);
  for (const count of [0, 1, 2, 100, 2_000_000]) assert.equal(createMovingPointIndex(count), null);
  for (const count of [-1, 1.5, Infinity, 0x100000000]) assert.throws(() => createMovingPointIndex(count));
  assert.equal(POINT_CLOUD_RENDERER.antialias, false);
  assert.equal(POINT_CLOUD_RENDERER.logarithmicDepthBuffer, false);
});

test("cloud presentations share CPU attributes, center cached geometry once, and keep independent draw/material state", () => {
  const source = cloudFixture();
  const colorsBefore = source.geometry.getAttribute("color").array.slice();
  const first = createPointCloudPresentation(source);
  const centered = source.geometry.getAttribute("position").array.slice();
  const second = createPointCloudPresentation(source);
  assert.deepEqual(source.geometry.getAttribute("position").array, centered);
  assert.deepEqual(source.geometry.getAttribute("color").array, colorsBefore);
  assert.notEqual(first.geometry, source.geometry); assert.notEqual(first.geometry, second.geometry);
  assert.equal(first.geometry.getAttribute("position"), source.geometry.getAttribute("position"));
  assert.equal(first.geometry.getAttribute("color"), source.geometry.getAttribute("color"));
  assert.ok(first.geometry.boundingBox.getCenter(new Vector3()).length() < 1e-8);
  assert.notEqual(first.material, source.material); assert.notEqual(first.material, second.material);
  assert.equal(first.material.vertexColors, true); assert.equal(first.material.size, 0.1);
  assert.equal(source.geometry.index, null); assert.equal(source.geometry.drawRange.count, Infinity);
  const hits = []; first.raycast({}, hits); assert.deepEqual(hits, []);
  for (const cloud of [first, second, source]) { cloud.geometry.dispose(); cloud.material.dispose(); }
});

test("movement is debounced and restores every point without changing colors, bounds or loaded attributes", () => {
  const source = cloudFixture(), points = createPointCloudPresentation(source), clock = timerFixture();
  let invalidations = 0;
  const position = points.geometry.getAttribute("position"), color = points.geometry.getAttribute("color");
  const bounds = points.geometry.boundingBox.clone();
  const controller = createPointCloudMotion(points, () => invalidations++, { budget: 4, schedule: clock.schedule });
  assert.equal(points.geometry.index, null); assert.equal(points.geometry.drawRange.count, 20);
  controller.moving(); const sampledIndex = points.geometry.index;
  assert.equal(sampledIndex.count, 4); assert.equal(points.geometry.drawRange.count, 4);
  controller.moving();
  assert.equal(points.geometry.index, sampledIndex, "the same GPU index buffer is reused during movement");
  assert.equal(clock.timers[0].canceled, true); assert.equal(clock.timers[1].delay, 180);
  assert.equal(invalidations, 1);
  clock.flush();
  assert.equal(points.geometry.index, null); assert.equal(points.geometry.drawRange.count, 20);
  assert.equal(invalidations, 2, "full detail requests its final frame on a demand canvas");
  assert.equal(points.geometry.getAttribute("position"), position); assert.equal(points.geometry.getAttribute("color"), color);
  assert.deepEqual(points.geometry.boundingBox, bounds);
  assert.equal(source.geometry.index, null);
  controller.dispose(); source.geometry.dispose(); source.material.dispose();
});

test("unmount disposes the cached motion GPU index even at full detail and cancels stale restore work", () => {
  const source = cloudFixture(), points = createPointCloudPresentation(source), clock = timerFixture();
  let invalidations = 0, geometryDisposals = 0, materialDisposals = 0, sourceDisposals = 0, disposedIndex;
  source.geometry.addEventListener("dispose", () => sourceDisposals++);
  points.geometry.addEventListener("dispose", () => { geometryDisposals++; disposedIndex = points.geometry.index; });
  points.material.addEventListener("dispose", () => materialDisposals++);
  const create = () => createPointCloudMotion(points, () => invalidations++, { budget: 4, schedule: clock.schedule });
  const controller = create(); controller.moving(); const index = points.geometry.index;
  clock.flush(); assert.equal(points.geometry.index, null);
  controller.moving(); const staleRestore = clock.timers.at(-1).callback;
  controller.dispose(); const count = invalidations;
  staleRestore(); controller.moving(); controller.dispose();
  assert.equal(invalidations, count); assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 1);
  assert.equal(disposedIndex, index); assert.equal(sourceDisposals, 0);
  // React Strict Mode can set up effects again on the same presentation.
  const replacement = create(); replacement.moving(); assert.equal(points.geometry.drawRange.count, 4);
  clock.flush(); assert.equal(points.geometry.drawRange.count, 20); replacement.dispose();
  source.geometry.dispose(); source.material.dispose();
});

test("small clouds keep every point and do not schedule density work", () => {
  const source = cloudFixture(3), points = createPointCloudPresentation(source), clock = timerFixture();
  let invalidations = 0;
  const controller = createPointCloudMotion(points, () => invalidations++, { budget: 4, schedule: clock.schedule });
  controller.moving(); assert.equal(clock.timers.length, 0); assert.equal(invalidations, 0);
  assert.equal(points.geometry.index, null); assert.equal(points.geometry.drawRange.count, 3);
  controller.dispose(); source.geometry.dispose(); source.material.dispose();
});

function packedFixture({ count = 100, compressed = false, crlf = false, fields = ["x", "y", "z", "rgb"] } = {}) {
  const header = Buffer.from([
    "VERSION 0.7", "FIELDS " + fields.join(" "), "SIZE 4 4 4 4",
    "TYPE " + fields.map(name => name === "rgb" ? "U" : "F").join(" "), "COUNT 1 1 1 1",
    "WIDTH " + count, "HEIGHT 1", "VIEWPOINT 0 0 0 1 0 0 0", "POINTS " + count,
    "DATA " + (compressed ? "binary_compressed" : "binary"), "",
  ].join(crlf ? "\r\n" : "\n"));
  const body = Buffer.alloc(count * 16);
  for (let i = 0; i < count; i++) for (let field = 0; field < fields.length; field++) {
    const offset = compressed ? field * count * 4 + i * 4 : i * 16 + field * 4;
    const axis = ["x", "y", "z"].indexOf(fields[field]);
    if (axis >= 0) body.writeFloatLE(i / (axis + 1) - 30, offset);
    else body.writeUInt32LE((i % 256 << 16) | (77 << 8) | 199, offset);
  }
  if (!compressed) return { header, body, bytes: Buffer.concat([header, body]) };
  const chunks = [];
  for (let offset = 0; offset < body.length; offset += 32) {
    const literal = body.subarray(offset, offset + 32);
    chunks.push(Buffer.from([literal.length - 1]), literal);
  }
  const packed = Buffer.concat(chunks), sizes = Buffer.alloc(8);
  sizes.writeUInt32LE(packed.length); sizes.writeUInt32LE(body.length, 4);
  return { header, body, bytes: Buffer.concat([header, sizes, packed]) };
}

const asArrayBuffer = bytes => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);

test("workshop reader matches the established XYZ/RGB reader for binary and compressed clouds", () => {
  for (const compressed of [false, true]) for (const fields of [["x", "y", "z", "rgb"], ["rgb", "z", "x", "y"]]) {
    const fixture = packedFixture({ compressed, fields });
    const original = new PCDLoader().parse(asArrayBuffer(fixture.bytes), "odm.pcd");
    const actual = new WorkshopPCDLoader().parse(asArrayBuffer(fixture.bytes), "odm.pcd");
    try {
      assert.deepEqual(actual.geometry.getAttribute("position").array, original.geometry.getAttribute("position").array);
      const colors = actual.geometry.getAttribute("color"), expected = original.geometry.getAttribute("color");
      assert.ok(colors.array instanceof Uint8Array);
      assert.equal(colors.normalized, true);
      assert.equal(colors.count, expected.count);
      for (let i = 0; i < colors.count; i++) for (const channel of ["getX", "getY", "getZ"]) assert.ok(Math.abs(colors[channel](i) - expected[channel](i)) < 1e-6);
      assert.equal(actual.material.vertexColors, true);
      assert.deepEqual(actual.geometry.boundingSphere, original.geometry.boundingSphere);
      assert.equal(actual.name, "odm.pcd");
    } finally {
      for (const cloud of [original, actual]) { cloud.geometry.dispose(); cloud.material.dispose(); }
    }
  }
});

test("workshop reader decodes only a bounded header and keeps growing arrays out of the binary path", () => {
  const fixture = packedFixture({ count: 10000 });
  const originalDecoder = global.TextDecoder;
  let largestTextInput = 0;
  global.TextDecoder = class extends originalDecoder {
    decode(input, options) { largestTextInput = Math.max(largestTextInput, input.byteLength); return super.decode(input, options); }
  };
  try {
    const cloud = new WorkshopPCDLoader().parse(asArrayBuffer(fixture.bytes), "large.pcd");
    assert.ok(largestTextInput <= 64 * 1024);
    assert.ok(largestTextInput < fixture.bytes.length);
    assert.ok(cloud.geometry.getAttribute("position").array instanceof Float32Array);
    assert.equal(cloud.geometry.getAttribute("position").count, 10000);
    cloud.geometry.dispose(); cloud.material.dispose();
  } finally { global.TextDecoder = originalDecoder; }
});

test("workshop reader handles CRLF headers without shifting the binary payload", () => {
  for (const compressed of [false, true]) {
    const actual = new WorkshopPCDLoader().parse(asArrayBuffer(packedFixture({ compressed, crlf: true }).bytes), "crlf.pcd");
    const expected = new WorkshopPCDLoader().parse(asArrayBuffer(packedFixture({ compressed }).bytes), "lf.pcd");
    for (const attribute of ["position", "color"]) assert.deepEqual(actual.geometry.getAttribute(attribute).array, expected.geometry.getAttribute(attribute).array);
    for (const cloud of [actual, expected]) { cloud.geometry.dispose(); cloud.material.dispose(); }
  }
});

test("workshop reader supports overlapping LZF references and rejects truncated or invalid data", () => {
  const fixture = packedFixture({ count: 3, compressed: true });
  const sizes = Buffer.alloc(8); sizes.writeUInt32LE(5); sizes.writeUInt32LE(48, 4);
  const bytes = Buffer.concat([fixture.header, sizes, Buffer.from([0, 0, 224, 38, 0])]);
  const cloud = new WorkshopPCDLoader().parse(asArrayBuffer(bytes), "zeros.pcd");
  assert.equal(cloud.geometry.getAttribute("position").count, 3);
  assert.ok(cloud.geometry.getAttribute("position").array.every(value => value === 0));
  cloud.geometry.dispose(); cloud.material.dispose();
  for (const invalid of [bytes.subarray(0, bytes.length - 1), Buffer.concat([fixture.header, sizes, Buffer.from([0, 0, 224, 38, 4])])]) {
    assert.throws(() => new WorkshopPCDLoader().parse(asArrayBuffer(invalid), "bad.pcd"), /PCD/);
  }
  const binary = packedFixture(); binary.bytes.writeFloatLE(NaN, binary.header.length);
  assert.throws(() => new WorkshopPCDLoader().parse(asArrayBuffer(binary.bytes), "bad.pcd"), /non-finite/);
});

test("ASCII legacy files retain the established parser behavior", () => {
  const header = packedFixture({ count: 1 }).header.toString().replace("DATA binary", "DATA ascii");
  const bytes = Buffer.from(header + "1 2 3 66051\n");
  const actual = new WorkshopPCDLoader().parse(asArrayBuffer(bytes), "legacy.pcd");
  const expected = new PCDLoader().parse(asArrayBuffer(bytes), "legacy.pcd");
  assert.deepEqual(actual.geometry.getAttribute("position").array, expected.geometry.getAttribute("position").array);
  assert.deepEqual(actual.geometry.getAttribute("color").array, expected.geometry.getAttribute("color").array);
  for (const cloud of [actual, expected]) { cloud.geometry.dispose(); cloud.material.dispose(); }
});

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
