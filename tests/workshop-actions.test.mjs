import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import * as visibility from "../lib/workshop-visibility.ts";
import * as detectionLabels from "../lib/helpers/detection-labels.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const ids = ["AH-0260001", "AH-0260002", "AH-0260003"];
const policy = visibility.parseWorkshopVisibility({
  enabled: true,
  visibleSurveys: { BARBCO2026: ids },
});
const client = { id: "barbco-client", code: "BARBCO2026", name: "BARBCO" };
const rows = [...ids, "AH-026012", "AH-026013"].map((id) => ({
  id,
  code: "BARBCO2026",
  access_code: "BARBCO2026",
  flight_date: "2026-03-18",
  ortho: { tile_folder: "round-corners" },
  point_cloud: { available: true },
  client,
}));
rows.push({
  id: "AH-026005",
  code: "DNG",
  access_code: "DNG",
  flight_date: "2026-03-18",
  ortho: null,
  client: { id: "dng-client", code: "DNG", name: "DNG" },
});

function detection(overrides) {
  return {
    areaCode: ids[0],
    pairId: "pair",
    areaPairId: "area-pair",
    label: "Banana Plant",
    bbox: {
      min_lat: 1,
      min_lon: 1,
      max_lat: 2,
      max_lon: 2,
      cen_lat: 1.5,
      cen_lon: 1.5,
    },
    ...overrides,
  };
}

const detections = [
  detection({ areaCode: ids[0] }),
  detection({ areaCode: "AH-026012" }),
  detection({ areaCode: "AH-026005" }),
];

function loadActions(
  filename,
  code = "BARBCO2026",
  activePolicy = policy,
  detectionRows = detections,
) {
  const counters = { catalogLoads: 0, downloads: 0 };
  const authorizedRows = rows.filter((row) => row.code === code);
  const supabase = {
    storage: {
      from: () => ({
        download: async () => {
          counters.downloads++;
          return {
            data: new Blob([JSON.stringify(detectionRows)]),
            error: null,
          };
        },
      }),
    },
  };
  const policyModule = {
    ...visibility,
    getWorkshopVisibility: () => activePolicy,
    isWorkshopSurveyVisible: (clientCode, id) =>
      visibility.isWorkshopSurveyVisible(clientCode, id, activePolicy),
    filterWorkshopClients: (clients) =>
      visibility.filterWorkshopClients(clients, activePolicy),
    filterWorkshopDetectionObjects: (objects, clientCode) =>
      visibility.filterWorkshopDetectionObjects(objects, clientCode, activePolicy),
  };
  const mocks = {
    "@/lib/recording/surveys": {
      loadRecordingSurveys: async () => {
        counters.catalogLoads++;
        return authorizedRows;
      },
    },
    "@/lib/recording/context": {
      requireRecordingAccount: async () => ({ supabase }),
    },
    "@/lib/workshop-visibility": policyModule,
    "@/lib/helpers/detection-labels": detectionLabels,
  };
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  new Function("require", "exports", compiled)(
    (name) => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    exports,
  );
  return { actions: exports, counters };
}

test("detail action intersects recording authorization with workshop visibility", async () => {
  const { actions } = loadActions("lib/actions/survey.ts");
  for (const hidden of ["AH-026012", "AH-026013", "AH-026005"]) {
    assert.equal(await actions.getUserSurvey(hidden), null);
  }
  assert.equal((await actions.getUserSurvey(ids[0])).id, ids[0]);
});

test("dashboard and detection results contain only selected surveys", async () => {
  const { actions } = loadActions("lib/actions/surveys.ts");
  assert.deepEqual((await actions.getAllUserSurveys()).map((survey) => survey.id), ids);
  assert.deepEqual(await actions.getObjectDetectionData(), [detections[0]]);
  assert.deepEqual(await actions.getObjectDetectionData("AH-026012"), []);
});

test("authorized accounts with no visible workshop surveys receive no analysis data", async () => {
  const { actions, counters } = loadActions("lib/actions/surveys.ts", "DNG");
  assert.deepEqual(await actions.getAllUserSurveys(), []);
  assert.deepEqual(await actions.getObjectDetectionData(), []);
  assert.equal(counters.downloads, 0);
});

test("the workshop allowlist never expands recording authorization", async () => {
  const { actions } = loadActions("lib/actions/survey.ts", "DNG");
  assert.equal(await actions.getUserSurvey(ids[0]), null);
});

test("client listings respect both recording scope and workshop visibility", async () => {
  const enabled = loadActions("lib/actions/clients.ts");
  assert.deepEqual(await enabled.actions.getAllClients(), [client]);
  const disabled = visibility.parseWorkshopVisibility({
    enabled: false,
    visibleSurveys: {},
  });
  const normal = loadActions("lib/actions/surveys.ts", "DNG", disabled);
  assert.deepEqual(
    (await normal.actions.getAllUserSurveys()).map((survey) => survey.id),
    ["AH-026005"],
  );
  const normalClients = loadActions("lib/actions/clients.ts", "DNG", disabled);
  assert.equal((await normalClients.actions.getAllClients()).length, 1);
});

test("all detection pages normalize health labels while preserving workshop scope", async () => {
  const raw = [
    detection({ areaCode: ids[0], pairId: "old", label: "Banana Plant (Healthy-looking)" }),
    detection({ areaCode: ids[0], pairId: "new", label: "Banana Plant (Healthy Looking)" }),
    detection({ areaCode: ids[1], pairId: "spaces", label: "Banana  Plant (Healthy Looking)" }),
    detection({ areaCode: ids[0], pairId: "infected", label: "Banana Plant (Infected)" }),
    detection({ areaCode: ids[0], pairId: "unhealthy", label: "Banana  Plant (Unhealthy looking)" }),
    detection({ areaCode: "AH-026012", pairId: "hidden", label: "Banana Plant (Healthy Looking)" }),
  ];
  const original = structuredClone(raw);
  const { actions } = loadActions("lib/actions/surveys.ts", "BARBCO2026", policy, raw);
  const all = await actions.getObjectDetectionData();
  assert.equal(all.length, 5);
  assert.equal(all.filter((object) => object.label === detectionLabels.INFECTED_BANANA_LABEL).length, 2);
  assert.equal(all.filter((object) => object.label === detectionLabels.HEALTHY_BANANA_LABEL).length, 3);
  const detail = await actions.getObjectDetectionData(ids[0]);
  assert.deepEqual(detail.map((object) => object.pairId), ["old", "new", "infected", "unhealthy"]);
  assert.equal(detail.filter((object) => object.label.includes("Healthy-looking")).length, 2);
  assert.deepEqual(raw, original);
});

test("combined JSON retains both detection models after authorization and normalization", async () => {
  const raw = [
    detection({ areaCode: ids[0], pairId: "1", label: "Banana  Plant" }),
    detection({ areaCode: ids[0], pairId: "1", label: "Banana Plant (Healthy-Looking)" }),
    detection({ areaCode: ids[0], pairId: "2", label: "Banana Plant (Infected)" }),
    detection({ areaCode: ids[1], pairId: "1", label: "Banana Plant (Infected)" }),
    detection({ areaCode: "AH-026012", pairId: "hidden", label: "Banana Plant" }),
  ];
  const original = structuredClone(raw);
  const { actions, counters } = loadActions("lib/actions/surveys.ts", "BARBCO2026", policy, raw);
  const all = await actions.getObjectDetectionData();
  assert.equal(all.length, 4);
  assert.equal(all[0].label, detectionLabels.INVENTORY_BANANA_LABEL);
  assert.equal(all[1].label, detectionLabels.HEALTHY_BANANA_LABEL);
  assert.equal(counters.downloads, 1);
  const detail = await actions.getObjectDetectionData(ids[0]);
  assert.equal(detail.length, 3);
  assert.equal(detectionLabels.countPlantDetections(detail).total, 1);
  assert.equal(detectionLabels.countPlantDetections(detail).analysisBanana, 2);
  assert.equal(detectionLabels.countPlantDetections(all).total, 2);
  assert.deepEqual(raw, original);
});

test("direct workshop file routes retain manifest authorization", () => {
  for (const file of ["app/tiles/[...path]/route.ts", "app/3d/[...path]/route.ts"]) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /authorizeProtectedAssetRequest/);
    assert.match(source, /status:\s*401/);
    assert.match(source, /Cache-Control.*no-store/);
  }
});
