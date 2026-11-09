const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { Box3, PerspectiveCamera, Vector3 } = require("three");
const { OrbitControls } = require("three-stdlib");
const exported = {};
new Function("require", "exports", ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib/three/point-cloud-navigation.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(require, exported);
const { createSurveyNavigation, surveyViewDirection, NAVIGATION_SETTINGS } = exported;

const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
function setup(t, { aspect = 1.5, reduce = false, bounds = new Box3(new Vector3(-150, -100, -10), new Vector3(150, 100, 10)) } = {}) {
  const camera = new PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.set(1, -1, 1);
  const controls = new OrbitControls(camera);
  let frames = 0;
  const nav = createSurveyNavigation(camera, controls, bounds, () => frames++, reduce);
  t.after(() => { nav.dispose(); controls.dispose(); });
  const settle = () => { for (let frame = 0; frame < 40; frame++) { nav.update(0.016); controls.update(); } };
  const direction = () => camera.position.clone().sub(controls.target).normalize();
  const distance = () => camera.position.distanceTo(controls.target);
  return { camera, controls, nav, bounds, settle, direction, distance, frames: () => frames };
}
function assertFramed({ camera, bounds }) {
  camera.updateMatrixWorld();
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const projected = new Vector3(x, y, z).project(camera);
    assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && Math.abs(projected.z) < 1, JSON.stringify(projected));
  }
}

test("new models start upright in a fully framed angled view for wide and portrait viewports", t => {
  for (const aspect of [2.5, 1.5, 0.45]) {
    const fixture = setup(t, { aspect });
    assert.deepEqual(fixture.camera.up.toArray(), [0, 0, 1]);
    near(fixture.direction().distanceTo(new Vector3(1, -1, 1).normalize()), 0);
    assertFramed(fixture);
    assert.equal(fixture.controls.rotateSpeed, 0.6);
    assert.equal(fixture.controls.panSpeed, 0.8);
    assert.equal(fixture.controls.zoomSpeed, 0.65);
  }
});

test("framing works for flat, tiny, tall and nonzero-centered bounds", t => {
  for (const bounds of [
    new Box3(new Vector3(-200, -100, 0), new Vector3(200, 100, 0)),
    new Box3(new Vector3(), new Vector3(0.0001, 0.0001, 0.0001)),
    new Box3(new Vector3(-1, -1, -500), new Vector3(1, 1, 500)),
    new Box3(new Vector3(100, 200, 50), new Vector3(400, 300, 80)),
  ]) assertFramed(setup(t, { bounds }));
});

test("Top view stays just above the pole, and Fit survey recenters without changing viewing direction", t => {
  const f = setup(t);
  f.nav.view("top"); f.settle();
  near(Math.acos(f.direction().z), NAVIGATION_SETTINGS.minPolarAngle);
  assertFramed(f);
  f.nav.pan(1, -1, 600); f.nav.zoom(true); f.settle();
  const direction = f.direction();
  assert.ok(f.controls.target.length() > 0);
  f.nav.view("fit"); f.settle();
  near(f.controls.target.length(), 0); near(f.direction().distanceTo(direction), 0);
  assertFramed(f);
});

test("the first frame after an idle interval cannot skip a 300 ms transition", t => {
  const f = setup(t), before = f.camera.position.clone();
  f.nav.view("top"); f.nav.update(90);
  near(f.camera.position.distanceTo(before), 0);
  f.nav.update(0.1); assert.notDeepEqual(f.camera.position, before);
  f.settle(); near(Math.acos(f.direction().z), NAVIGATION_SETTINGS.minPolarAngle);
});

test("manual navigation cancels a running preset and an idle controller stops requesting frames", t => {
  const f = setup(t);
  f.nav.view("top"); f.nav.update(0); f.nav.update(0.1);
  f.controls.dispatchEvent({ type: "start" });
  const before = f.camera.position.clone(), frames = f.frames();
  f.settle(); near(f.camera.position.distanceTo(before), 0); assert.equal(f.frames(), frames);
  f.nav.view("3d"); f.settle();
  const resting = f.frames(); f.settle(); assert.equal(f.frames(), resting);
});

test("zoom steps are reversible, accumulate during animation, and respect model-relative limits", t => {
  const f = setup(t), initial = f.distance();
  f.nav.zoom(true); f.settle(); near(f.distance(), initial * 0.8);
  f.nav.zoom(false); f.settle(); near(f.distance(), initial);
  f.nav.zoom(true); f.nav.zoom(true); f.nav.zoom(true); f.settle(); near(f.distance(), initial * 0.8 ** 3);
  for (let i = 0; i < 100; i++) f.nav.zoom(true);
  f.settle(); near(f.distance(), f.controls.minDistance);
  for (let i = 0; i < 100; i++) f.nav.zoom(false);
  f.settle(); near(f.distance(), f.controls.maxDistance);
});

test("rotation constraints keep the camera above the target plane", t => {
  const f = setup(t);
  f.controls.enableDamping = false;
  for (const direction of [new Vector3(0, 0, -1), new Vector3(0, 0, 1), new Vector3(1, 0, -1)]) {
    const clamped = surveyViewDirection("fit", direction);
    const polar = Math.acos(clamped.z);
    assert.ok(polar >= NAVIGATION_SETTINGS.minPolarAngle - 1e-10 && polar <= NAVIGATION_SETTINGS.maxPolarAngle + 1e-10);
    f.camera.position.copy(f.controls.target).addScaledVector(direction, 100);
    f.controls.update();
    assert.ok(f.camera.position.z > f.controls.target.z);
  }
});

test("resizing updates clipping and limits while preserving a manually adjusted camera and target", t => {
  const f = setup(t);
  f.nav.pan(2, -1, 640); f.nav.zoom(false); f.settle();
  const camera = f.camera.position.clone(), target = f.controls.target.clone();
  f.camera.aspect = 0.45; f.nav.resize();
  assert.deepEqual(f.camera.position, camera); assert.deepEqual(f.controls.target, target);
  assert.ok(f.camera.near > 0 && f.camera.far > f.controls.maxDistance);
  f.nav.view("fit"); f.settle(); assertFramed(f);
});

test("reduced motion disables damping and immediately completes both new and in-progress transitions", t => {
  const f = setup(t, { reduce: true });
  assert.equal(f.controls.enableDamping, false);
  f.nav.view("top"); near(Math.acos(f.direction().z), NAVIGATION_SETTINGS.minPolarAngle);
  f.nav.setReducedMotion(false); assert.equal(f.controls.enableDamping, true);
  f.nav.view("3d"); f.nav.update(0); f.nav.update(0.1);
  f.nav.setReducedMotion(true); near(f.direction().distanceTo(new Vector3(1, -1, 1).normalize()), 0);
  const frames = f.frames(); f.settle(); assert.equal(f.frames(), frames);
});

test("empty or non-finite model bounds fail clearly and disposal stops stale commands", t => {
  const camera = new PerspectiveCamera(), controls = new OrbitControls(camera);
  for (const bounds of [new Box3(), new Box3(new Vector3(NaN, 0, 0), new Vector3(1, 1, 1))]) {
    assert.throws(() => createSurveyNavigation(camera, controls, bounds, () => {}), /no viewable bounds/);
  }
  controls.dispose();
  const f = setup(t); f.nav.dispose();
  const before = f.camera.position.clone(), frames = f.frames();
  f.nav.view("top"); f.nav.zoom(true); f.nav.pan(1, 1, 640); f.nav.resize(); f.nav.setReducedMotion(true); f.settle();
  near(f.camera.position.distanceTo(before), 0); assert.equal(f.frames(), frames);
});
