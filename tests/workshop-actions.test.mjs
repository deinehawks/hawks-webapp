import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import * as visibility from "../lib/workshop-visibility.ts";
import * as detectionLabels from "../lib/helpers/detection-labels.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const ids = ["AH-0260001", "AH-0260002", "AH-0260003"];
const policy = visibility.parseWorkshopVisibility({ enabled: true, visibleSurveys: { BARBCO2026: ids } });
const rows = [...ids, "AH-026012", "AH-026013"].map((id) => ({
  id, code: "BARBCO2026", access_code: "BARBCO2026", flight_date: "2026-03-18",
  ortho: { tile_folder: "round-corners" }, point_cloud: { available: true },
}));
rows.push({ id: "AH-026005", code: "DNG", access_code: "DNG", flight_date: "2026-03-18", ortho: null });
const detections = [{ areaCode: ids[0] }, { areaCode: "AH-026012" }, { areaCode: "AH-026005" }];

function loadActions(filename, code = "BARBCO2026", activePolicy = policy, detectionRows = detections) {
  const counters = { queries: 0, downloads: 0 };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "existing-account" } }, error: null }) },
    from(table) {
      counters.queries++;
      const filters = {};
      const data = () => table === "clients"
        ? [{ code: "BARBCO2026" }, { code: "DNG" }, { code: "DXG" }]
        : rows.filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value));
      const query = {
        select() { return query; },
        eq(key, value) { filters[key] = value; return query; },
        order: async () => ({ data: data(), error: null }),
        single: async () => ({ data: data()[0] ?? null, error: null }),
        maybeSingle: async () => ({ data: data()[0] ?? null, error: null }),
      };
      return query;
    },
    storage: { from: () => ({
      download: async () => {
        counters.downloads++;
        return { data: new Blob([JSON.stringify(detectionRows)]), error: null };
      },
    }) },
  };
  const policyModule = {
    ...visibility,
    getWorkshopVisibility: () => activePolicy,
    isWorkshopSurveyIdVisible: (id) => visibility.isWorkshopSurveyIdVisible(id, activePolicy),
    isWorkshopSurveyVisible: (code, id) => visibility.isWorkshopSurveyVisible(code, id, activePolicy),
    filterWorkshopClients: (clients) => visibility.filterWorkshopClients(clients, activePolicy),
  };
  const mocks = {
    "@/utils/supabase/server": { createClient: async () => client },
    "./profiles": { getUserProfile: async () => ({ access_code: code }) },
    "next/navigation": {
      notFound: () => { throw new Error("NOT_FOUND"); },
      redirect: (url) => { throw new Error("REDIRECT:" + url); },
    },
    "@/lib/workshop-visibility": policyModule,
    "@/lib/helpers/detection-labels": detectionLabels,
    "@/lib/workshop-files": { getWorkshopDataDirectory: () => "fixture-tiles" },
    "@/lib/helpers/resolve-survey-tile-folder": { resolveSurveyTileFolder: (_, folder) => folder ?? "round-corners" },
    "@/lib/helpers/get-max-zoom": { getSurveyMaxZoom: () => 24 },
  };
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports = {};
  new Function("require", "exports", compiled)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    exports,
  );
  return { actions: exports, counters };
}

test("both detail actions hide unlisted surveys before reading Supabase", async () => {
  for (const filename of ["lib/actions/survey.ts", "lib/actions/surveys.ts"]) {
    const { actions, counters } = loadActions(filename);
    for (const hidden of ["AH-026012", "AH-026013", "AH-026005"]) {
      await assert.rejects(actions.getUserSurvey(hidden), /NOT_FOUND/);
    }
    assert.equal(counters.queries, 0);
    assert.equal((await actions.getUserSurvey(ids[0])).id, ids[0]);
  }
});

test("the dashboard list and detection results contain only selected surveys", async () => {
  const { actions } = loadActions("lib/actions/surveys.ts");
  assert.deepEqual((await actions.getAllUserSurveys()).map((survey) => survey.id), ids);
  assert.deepEqual(await actions.getObjectDetectionData(), [detections[0]]);
  assert.deepEqual(await actions.getObjectDetectionData("AH-026012"), []);
});

test("existing DNG accounts remain usable but receive no survey or analysis data", async () => {
  const { actions, counters } = loadActions("lib/actions/surveys.ts", "DNG");
  assert.deepEqual(await actions.getAllUserSurveys(), []);
  assert.deepEqual(await actions.getObjectDetectionData(), []);
  assert.equal(counters.queries, 0);
  assert.equal(counters.downloads, 0);
});

test("the allowlist does not bypass existing per-account survey authorization", async () => {
  for (const filename of ["lib/actions/survey.ts", "lib/actions/surveys.ts"]) {
    const { actions } = loadActions(filename, "DNG");
    await assert.rejects(actions.getUserSurvey(ids[0]), /Access denied/);
  }
});

test("client listings respect workshop visibility and disabling restores normal lists", async () => {
  const enabled = loadActions("lib/actions/clients.ts");
  assert.deepEqual(await enabled.actions.getAllClients(), [{ code: "BARBCO2026" }]);
  const disabled = visibility.parseWorkshopVisibility({ enabled: false, visibleSurveys: {} });
  const normal = loadActions("lib/actions/surveys.ts", "DNG", disabled);
  assert.deepEqual((await normal.actions.getAllUserSurveys()).map((survey) => survey.id), ["AH-026005"]);
  const normalClients = loadActions("lib/actions/clients.ts", "DNG", disabled);
  assert.equal((await normalClients.actions.getAllClients()).length, 3);
});


test("all detection pages receive normalized health labels while survey filtering stays intact", async () => {
  const raw = [
    { areaCode: ids[0], pairId: "old", label: "Banana Plant (Healthy-looking)" },
    { areaCode: ids[0], pairId: "new", label: "Banana Plant (Healthy Looking)" },
    { areaCode: ids[1], pairId: "spaces", label: "Banana  Plant (Healthy Looking)" },
    { areaCode: ids[0], pairId: "infected", label: "Banana Plant (Infected)" },
    { areaCode: ids[0], pairId: "unhealthy", label: "Banana  Plant (Unhealthy looking)" },
    { areaCode: "AH-026012", pairId: "hidden", label: "Banana Plant (Healthy Looking)" },
  ];
  const original = structuredClone(raw);
  const { actions } = loadActions("lib/actions/surveys.ts", "BARBCO2026", policy, raw);
  const all = await actions.getObjectDetectionData();
  assert.equal(all.length, 5);
  assert.equal(all.filter((o) => o.label === detectionLabels.INFECTED_BANANA_LABEL).length, 2);
  assert.equal(all.filter((o) => o.label === detectionLabels.HEALTHY_BANANA_LABEL).length, 3);
  assert.equal(all.find((o) => o.pairId === "infected").label, "Banana Plant (Infected)");
  const detail = await actions.getObjectDetectionData(ids[0]);
  assert.deepEqual(detail.map((o) => o.pairId), ["old", "new", "infected", "unhealthy"]);
  assert.equal(detail.filter((o) => o.label.includes("Healthy-looking")).length, 2);
  assert.deepEqual(raw, original);
});
