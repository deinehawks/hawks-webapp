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
  id, client_id: "BARBCO2026", code: "BARBCO2026", access_code: "BARBCO2026", flight_date: "2026-03-18",
  client: { id: "BARBCO2026", code: "BARBCO2026", name: "BARBCO" },
  orthos: [{ tile_folder: "round-corners", is_current: true }],
  point_clouds: [{ available: true, is_current: true }],
}));
rows.push({
  id: "AH-026005", client_id: "DNG", code: "DNG", access_code: "DNG", flight_date: "2026-03-18",
  client: { id: "DNG", code: "DNG", name: "DNG" }, orthos: [], point_clouds: [],
});
const detection = (areaCode, pairId, label = "Banana Plant") => ({
  areaCode, pairId, areaPairId: `area-${pairId}`, label,
  bbox: { min_lon: 1, max_lon: 2, min_lat: 3, max_lat: 4 },
});
const detections = [
  detection(ids[0], "visible"),
  detection("AH-026012", "hidden"),
  detection("AH-026005", "other-client"),
];

function loadActions(filename, code = "BARBCO2026", activePolicy = policy, detectionRows = detections) {
  const counters = { queries: 0, downloads: 0 };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "existing-account" } }, error: null }) },
    from(table) {
      counters.queries++;
      const filters = {};
      const data = () => table === "clients"
        ? [{ id: "BARBCO2026", code: "BARBCO2026", name: "BARBCO" }, { id: "DNG", code: "DNG", name: "DNG" }, { id: "DXG", code: "DXG", name: "DXG" }]
        : rows.filter((row) => row.code === code &&
            Object.entries(filters).every(([key, value]) => row[key] === value));
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
    filterWorkshopSurveys: (surveys) => visibility.filterWorkshopSurveys(surveys, activePolicy),
    filterWorkshopDetectionObjects: (objects, clientCode) =>
      visibility.filterWorkshopDetectionObjects(objects, clientCode, activePolicy),
    isWorkshopClientVisible: (clientCode) => visibility.isWorkshopClientVisible(clientCode, activePolicy),
  };
  class AuthorizationError extends Error {}
  const authorizedClient = { id: code, code, name: code };
  const mocks = {
    "@/utils/supabase/server": { createClient: async () => client },
    "@/lib/auth/user-context": {
      AuthorizationError,
      getAuthenticatedUserContext: async () => ({ user: { id: "existing-account" } }),
      requireAccessibleClientById: async () => authorizedClient,
      requireAccessibleClientByCode: async () => authorizedClient,
      listAccessibleClients: async () => [authorizedClient],
    },
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

test("the detail action hides unlisted surveys before reading Supabase", async () => {
  const { actions, counters } = loadActions("lib/actions/surveys.ts");
  for (const hidden of ["AH-026012", "AH-026013", "AH-026005"]) {
    await assert.rejects(actions.getUserSurvey(hidden), /NOT_FOUND/);
  }
  assert.equal(counters.queries, 0);
  assert.equal((await actions.getUserSurvey(ids[0])).id, ids[0]);
});

test("the dashboard list and detection results contain only selected surveys", async () => {
  const { actions } = loadActions("lib/actions/surveys.ts");
  assert.deepEqual((await actions.getAllUserSurveys()).map((survey) => survey.id), ids);
  assert.deepEqual((await actions.getObjectDetectionData()).map((object) => object.areaCode), [ids[0]]);
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
  const { actions } = loadActions("lib/actions/surveys.ts", "DNG");
  await assert.rejects(actions.getUserSurvey(ids[0]), /not found or access denied/i);
});

test("client listings respect workshop visibility and disabling restores normal lists", async () => {
  const enabled = loadActions("lib/actions/clients.ts");
  assert.deepEqual(
    (await enabled.actions.getAllClients()).map((client) => client.code),
    ["BARBCO2026"],
  );
  const disabled = visibility.parseWorkshopVisibility({ enabled: false, visibleSurveys: {} });
  const normal = loadActions("lib/actions/surveys.ts", "DNG", disabled);
  assert.deepEqual((await normal.actions.getAllUserSurveys()).map((survey) => survey.id), ["AH-026005"]);
  const normalClients = loadActions("lib/actions/clients.ts", "DNG", disabled);
  assert.equal((await normalClients.actions.getAllClients()).length, 3);
});


test("all detection pages receive normalized health labels while survey filtering stays intact", async () => {
  const raw = [
    detection(ids[0], "old", "Banana Plant (Healthy-looking)"),
    detection(ids[0], "new", "Banana Plant (Healthy Looking)"),
    detection(ids[1], "spaces", "Banana  Plant (Healthy Looking)"),
    detection(ids[0], "infected", "Banana Plant (Infected)"),
    detection(ids[0], "unhealthy", "Banana  Plant (Unhealthy looking)"),
    detection("AH-026012", "hidden", "Banana Plant (Healthy Looking)"),
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

test("one combined JSON retains both models while normalization and workshop scope stay intact", async () => {
  const raw = [
    detection(ids[0], "1", "Banana  Plant"),
    detection(ids[0], "1", "Banana Plant (Healthy-Looking)"),
    detection(ids[0], "2", "Banana Plant (Infected)"),
    detection(ids[1], "1", "Banana Plant (Infected)"),
    detection("AH-026012", "hidden", "Banana Plant"),
  ];
  const original = structuredClone(raw);
  const { actions, counters } = loadActions("lib/actions/surveys.ts", "BARBCO2026", policy, raw);
  const all = await actions.getObjectDetectionData();
  assert.equal(all.length, 4);
  assert.equal(all[0].label, detectionLabels.INVENTORY_BANANA_LABEL);
  assert.equal(all[1].label, detectionLabels.HEALTHY_BANANA_LABEL);
  assert.equal(counters.downloads, 1);
  const detail = await actions.getObjectDetectionData(ids[0]);
  assert.equal(detail.length, 3, "loading must preserve both models rather than choosing one before mode selection");
  assert.equal(detectionLabels.countPlantDetections(detail).total, 1);
  assert.equal(detectionLabels.countPlantDetections(detail).analysisBanana, 2);
  assert.equal(detectionLabels.countPlantDetections(all).total, 2, "overview retains the older survey's fallback");
  assert.deepEqual(raw, original);
});
