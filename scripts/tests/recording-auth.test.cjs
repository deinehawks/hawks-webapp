const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
// Tests use small in-memory fixtures only; no staging or asset traffic.
function load(file, imports) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, URL, console, require(name) {
    if (name === "server-only") return {};
    if (name in imports) return imports[name];
    throw new Error("Unexpected import: " + name);
  } });
  return exports;
}
const assets = load("lib/assets/protected-asset-auth.ts", {
  "@/lib/assets/minio-aliases": { resolveProtectedAssetStorageTarget: () => ({ upstreamUri: "/internal/test" }) },
});
test("asset parser accepts actual filenames but rejects malformed paths", () => {
  assert.ok(assets.parseProtectedAssetRequest("/asimov-hawks/3d/demo/2026/AH-026001/original-RGB.pcd"));
  assert.ok(assets.parseProtectedAssetRequest("/asimov-hawks/3d/demo/2027/AH-026001/original-RGB.pcd"));
  for (const url of [
    "/asimov-hawks/3d/demo/1999/AH-026001/original.pcd",
    "/asimov-hawks/3d/demo/2101/AH-026001/original.pcd",
    "/asimov-hawks/3d/demo/2026/AH-026001/file.exe",
    "/asimov-hawks/tiles/demo/2026/AH-026001/ortho/round-corners/%ZZ/0/0.png",
    "/asimov-hawks/3d/demo/2026/AH-026001/file.pcd/extra",
  ]) assert.equal(assets.parseProtectedAssetRequest(url), null);
});
test("anonymous asset requests never reach the manifest RPC", async () => {
  const result = await assets.authorizeProtectedAssetRequest({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    rpc: () => { throw new Error("RPC must not be called"); },
  }, "/asimov-hawks/3d/demo/2026/AH-026001/original.pcd");
  assert.equal(result.authorized, false);
});
test("unknown/cross-scope assets require manifest authorization", async () => {
  for (const result of [{ data: [], error: null }, { data: null, error: new Error("denied") }]) {
    const response = await assets.authorizeProtectedAssetRequest({
      auth: { getUser: async () => ({ data: { user: { id: "test" } }, error: null }) },
      rpc: async () => result,
    }, "/asimov-hawks/3d/demo/2026/AH-026001/original.pcd");
    assert.equal(response.authorized, false);
  }
});
function loadRecordingContext(role, account_status, onSignOut = () => {}) {
  const query = { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { role, account_status }, error: null }) };
  return load("lib/recording/context.ts", {
    react: { cache: (fn) => fn },
    "next/navigation": {
      redirect: () => { throw new Error("redirect"); },
      notFound: () => { throw new Error("not-found"); },
    },
    "@/utils/supabase/server": { createClient: async () => ({
      auth: {
        getUser: async () => ({ data: { user: { id: "test" } }, error: null }),
        signOut: async () => { onSignOut(); return { error: null }; },
      },
      from: () => query,
    }) },
  });
}

for (const [role, account_status, accepted] of [
  ["platform_admin", "active", true],
  ["user", "active", true],
  ["org_admin", "active", true],
  ["platform_admin", "suspended", false],
]) test("recording account gate: " + role + "/" + account_status, async () => {
  let signedOut = false;
  const context = loadRecordingContext(role, account_status, () => { signedOut = true; });
  if (accepted) assert.ok(await context.requireRecordingAccount());
  else {
    await assert.rejects(context.requireRecordingAccount(), /redirect/);
    assert.equal(signedOut, true);
  }
});

test("recording checklist remains platform-admin only", async () => {
  assert.ok(await loadRecordingContext("platform_admin", "active").requireRecordingAdmin());
  await assert.rejects(loadRecordingContext("user", "active").requireRecordingAdmin(), /not-found/);
});

test("recording signup cannot call Supabase account creation", async () => {
  const auth = load("lib/actions/auth.ts", {
    "@/utils/supabase/server": { createClient: () => { throw new Error("No account writes allowed"); } },
    "next/cache": { revalidatePath: () => {} },
    "next/navigation": { redirect: () => {} },
  });
  assert.ok((await auth.signup({ email: "unused@example.test", password: "unused" })).error);
});
test("inactive login is signed out and returns a friendly error", async () => {
  let signedOut = false;
  const query = { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { account_status: "pending" }, error: null }) };
  const auth = load("lib/actions/auth.ts", {
    "@/utils/supabase/server": { createClient: async () => ({
      auth: {
        signInWithPassword: async () => ({ data: { user: { id: "test" } }, error: null }),
        signOut: async () => { signedOut = true; return { error: null }; },
      },
      from: () => query,
    }) },
    "next/cache": { revalidatePath: () => {} },
    "next/navigation": { redirect: () => {} },
  });
  const result = await auth.login({ email: "member@example.test", password: "unused" });
  assert.equal(signedOut, true);
  assert.match(result.error, /not active/i);
});
test("missing coordinates do not poison the overview center", () => {
  const helpers = load("lib/helpers.ts", { "date-fns": {} });
  const result = helpers.calculateGlobalCenters([
    { min_x: null, max_x: null, min_y: null, max_y: null },
    { min_x: 125, max_x: 126, min_y: 7, max_y: 8 },
  ]);
  assert.equal(result.global_x, 125.5);
  assert.equal(result.global_y, 7.5);
  const empty = helpers.calculateGlobalCenters([]);
  assert.ok(Number.isFinite(empty.global_x) && Number.isFinite(empty.global_y));
});
test("no published assets produces an empty dashboard without static catalog files", async () => {
  const adapter = load("lib/recording/surveys.ts", {
    react: { cache: (fn) => fn },
    "./context": { requireRecordingAccount: async () => ({ supabase: {
      from: () => { throw new Error("survey query must not run"); },
      rpc: async () => ({ data: [], error: null }),
    } }) },
    "./limits": { RECORDING_PCD_MAX_BYTES: 5 * 1024 * 1024 * 1024 },
  });
  assert.equal((await adapter.loadRecordingSurveys()).length, 0);
});
async function adaptedSurvey({
  clientCode = "demo",
  current = true,
  variant = "round-corners",
  cloudCode = null,
  cloudCurrent = true,
  pointCloudPointer = null,
  bindingCode = cloudCode,
} = {}) {
  const row = {
    id: "AH-026001", client: { id: "client", code: "DEMO", name: "Demo" },
    orthos: current ? [{ id: "AH-026001", survey_id: "AH-026001", is_current: true, tile_folder: variant }] : [],
    ortho: current ? "AH-026001" : null,
    point_cloud: pointCloudPointer,
    point_clouds: cloudCode ? [{ code: cloudCode, survey_id: "AH-026001", is_current: cloudCurrent, num_points: 123 }] : [],
    tags: null, boundaries: null, geojson_boundaries: null,
    min_x: null, max_x: null, min_y: null, max_y: null,
  };
  const tile = { url: "/asimov-hawks/tiles/demo/2026/AH-026001/ortho/round-corners/{z}/{x}/{y}.png",
    tileFolder: "round-corners", minZoom: 10, maxZoom: 20, bounds: [125, 7, 126, 8] };
  const query = { select() { return this; }, in() { return this; }, order: async () => ({ data: [row], error: null }) };
  const publishedAssets = [{
    source_kind: "publication",
    publication_id: "publication",
    output_id: "output",
    survey_id: row.id,
    output_type: "orthomosaic",
    artifact_code: row.id,
    dataset_year: 2026,
    client_code: clientCode,
    route_template: tile.url,
    tile_folder: tile.tileFolder,
    min_zoom: tile.minZoom,
    max_zoom: tile.maxZoom,
    bounds: tile.bounds,
    file_name: null,
    byte_size: null,
  }, ...(cloudCode ? [{
    source_kind: "publication",
    publication_id: "publication-cloud",
    output_id: "output-cloud",
    survey_id: row.id,
    output_type: "point_cloud",
    artifact_code: bindingCode,
    dataset_year: 2026,
    client_code: clientCode,
    route_template: "/asimov-hawks/3d/demo/2026/AH-026001/original.pcd",
    tile_folder: null,
    min_zoom: null,
    max_zoom: null,
    bounds: null,
    file_name: "original.pcd",
    byte_size: 100,
  }] : [])];
  const adapter = load("lib/recording/surveys.ts", {
    react: { cache: (fn) => fn },
    "./context": { requireRecordingAccount: async () => ({ supabase: {
      from: () => query,
      rpc: async () => ({ data: publishedAssets, error: null }),
    } }) },
    "./limits": { RECORDING_PCD_MAX_BYTES: 5 * 1024 * 1024 * 1024 },
  });
  return (await adapter.loadRecordingSurveys())[0];
}
test("adapter uses verified bounds without inventing survey dates or boundaries", async () => {
  const row = await adaptedSurvey();
  assert.equal(row.min_x, 125); assert.equal(row.max_y, 8);
  assert.equal(row.boundaries.length, 0); assert.equal(row.geojson_boundaries.length, 0);
  assert.equal(row.flight_date, undefined); assert.equal(row.recording_ready, false);
  assert.equal(row.recording_clouds.length, 0);
});
test("published assets cannot invent a current output", async () => {
  assert.equal((await adaptedSurvey({ current: false })).tile_url, null);
});
test("client and tile variant mismatches fail closed", async () => {
  assert.equal((await adaptedSurvey({ clientCode: "other" })).tile_url, null);
  assert.equal((await adaptedSurvey({ variant: "sharp-corners" })).tile_url, null);
});
test("point-cloud delivery requires the selected current output and published artifact binding", async () => {
  const options = { cloudCode: "AH-026001", pointCloudPointer: "AH-026001" };
  const exact = await adaptedSurvey(options);
  assert.equal(exact.point_cloud.code, "AH-026001");
  assert.equal(exact.point_cloud.num_points, 123);
  assert.equal(exact.recording_clouds.length, 1);
  assert.equal((await adaptedSurvey({ ...options, pointCloudPointer: null })).recording_clouds.length, 0);
  assert.equal((await adaptedSurvey({ ...options, cloudCurrent: false })).recording_clouds.length, 0);
  assert.equal((await adaptedSurvey({ ...options, bindingCode: "other-output" })).recording_clouds.length, 0);
});
