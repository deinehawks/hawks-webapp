import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  parseWorkshopVisibility, createWorkshopVisibilityReader, getWorkshopVisibility,
  isWorkshopSurveyVisible, isWorkshopSurveyIdVisible, isWorkshopClientVisible,
  filterWorkshopSurveys, filterWorkshopClients, filterWorkshopDetectionObjects,
  hiddenWorkshopAssetResponse, applyWorkshopAssetCachePolicy,
  getWorkshopDemoCountMultipliers,
} from "../lib/workshop-visibility.ts";

const selected = ["AH-0260001", "AH-0260002", "AH-0260003"];
const policy = parseWorkshopVisibility({ enabled: true, visibleSurveys: { BARBCO2026: selected } });
const disabled = parseWorkshopVisibility({ enabled: false, visibleSurveys: {} });

test("the installed local configuration is valid", () => {
  const installed = parseWorkshopVisibility(
    JSON.parse(fs.readFileSync(path.join("config", "workshop-visibility.json"), "utf8")),
  );
  assert.equal(getWorkshopVisibility().enabled, installed.enabled);
  assert.equal(typeof installed.enabled, "boolean");
  for (const [code, ids] of Object.entries(installed.visibleSurveys)) {
    assert.ok(code.length > 0);
    assert.ok(Array.isArray(ids));
  }
});

test("survey visibility matches both the client and the exact survey ID", () => {
  for (const id of selected) assert.equal(isWorkshopSurveyVisible("barbco2026", id, policy), true);
  for (const id of ["AH-026012", "AH-026013"]) {
    assert.equal(isWorkshopSurveyVisible("BARBCO2026", id, policy), false);
    assert.equal(isWorkshopSurveyIdVisible(id, policy), false);
  }
  assert.equal(isWorkshopSurveyVisible("DNG", "AH-026005", policy), false);
  assert.equal(isWorkshopSurveyVisible("DNG", selected[0], policy), false);
  assert.equal(isWorkshopClientVisible("DNG", policy), false);
  assert.equal(isWorkshopClientVisible("BARBCO2026", policy), true);
});

test("lists and analytics never include hidden surveys or clients", () => {
  const surveys = [...selected, "AH-026012", "AH-026013"].map((id) => ({ code: "BARBCO2026", id }));
  surveys.push({ code: "DNG", id: "AH-026005" });
  assert.deepEqual(filterWorkshopSurveys(surveys, policy).map((s) => s.id), selected);
  assert.deepEqual(filterWorkshopClients([{ code: "BARBCO2026" }, { code: "DNG" }, { code: "DXG" }], policy), [{ code: "BARBCO2026" }]);
  const detections = [{ areaCode: selected[0] }, { areaCode: "AH-026012" }, { areaCode: "AH-026005" }, {}];
  assert.deepEqual(filterWorkshopDetectionObjects(detections, "BARBCO2026", policy), [detections[0]]);
  assert.deepEqual(filterWorkshopDetectionObjects(detections, "DNG", policy), []);
});

test("hidden tile and PCD paths return uncacheable 404s for GET and HEAD", async () => {
  const request = (method) => new Request("http://localhost/asimov-hawks/tiles/example", { method });
  for (const [client, id] of [["barbco2026", "AH-026012"], ["barbco2026", "AH-026013"], ["dng", "AH-026005"], ["dng", selected[0]]]) {
    for (const suffix of [["ortho", "sharp-corners", "11", "1738", "1065.png"], ["odm.pcd"]]) {
      for (const method of ["GET", "HEAD"]) {
        const response = hiddenWorkshopAssetResponse(request(method), [client, "2026", id, ...suffix], policy);
        assert.equal(response.status, 404);
        assert.equal(response.headers.get("cache-control"), "no-store");
        if (method === "HEAD") assert.equal(response.body, null);
        else assert.equal(await response.text(), "Not found");
      }
    }
  }
  assert.equal(hiddenWorkshopAssetResponse(request("GET"), ["barbco2026", "2026", selected[0], "odm.pcd"], policy), null);
  assert.equal(hiddenWorkshopAssetResponse(request("GET"), ["barbco2026"], policy).status, 404);
});

test("turning workshop mode off restores normal visibility and caching", () => {
  const oldSurvey = { code: "DNG", id: "AH-026005" };
  const objects = [{ areaCode: oldSurvey.id }];
  assert.equal(isWorkshopSurveyVisible(oldSurvey.code, oldSurvey.id, disabled), true);
  assert.equal(isWorkshopSurveyIdVisible(oldSurvey.id, disabled), true);
  assert.deepEqual(filterWorkshopSurveys([oldSurvey], disabled), [oldSurvey]);
  assert.deepEqual(filterWorkshopDetectionObjects(objects, "DNG", disabled), objects);
  assert.equal(hiddenWorkshopAssetResponse(new Request("http://localhost"), ["dng", "2026", oldSurvey.id, "odm.pcd"], disabled), null);
  const response = new Response("tile", { headers: { "Cache-Control": "private, max-age=3600" } });
  assert.equal(applyWorkshopAssetCachePolicy(response, disabled).headers.get("cache-control"), "private, max-age=3600");
});

test("workshop assets require revalidation, while errors keep no-store", () => {
  for (const status of [200, 206, 304]) {
    const response = new Response(null, { status });
    assert.equal(applyWorkshopAssetCachePolicy(response, policy).headers.get("cache-control"), "private, max-age=0, must-revalidate");
  }
  const error = new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  assert.equal(applyWorkshopAssetCachePolicy(error, policy).headers.get("cache-control"), "no-store");
});

test("local JSON changes are picked up without rebuilding and cached between changes", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hawks-workshop-policy-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filename = path.join(root, "visibility.json");
  fs.writeFileSync(filename, JSON.stringify({ enabled: true, visibleSurveys: { BARBCO2026: selected } }));
  const read = createWorkshopVisibilityReader(filename);
  const original = fs.readFileSync;
  const reader = t.mock.method(fs, "readFileSync", (...args) => original(...args));
  assert.equal(read().enabled, true);
  assert.equal(read().enabled, true);
  assert.equal(reader.mock.calls.filter((call) => call.arguments[0] === filename).length, 1);

  fs.writeFileSync(filename, JSON.stringify({ enabled: false, visibleSurveys: {} }));
  const later = new Date(Date.now() + 2000);
  fs.utimesSync(filename, later, later);
  assert.equal(read().enabled, false);
});

test("a broken or missing config hides surveys and recovers after repair", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hawks-workshop-policy-error-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filename = path.join(root, "visibility.json");
  const warnings = [];
  const read = createWorkshopVisibilityReader(filename, (message) => warnings.push(message));
  assert.equal(isWorkshopSurveyVisible("BARBCO2026", selected[0], read()), false);
  read();
  assert.equal(warnings.length, 1);
  fs.writeFileSync(filename, "broken json");
  assert.equal(read().enabled, true);
  assert.deepEqual(Object.keys(read().visibleSurveys), []);
  fs.writeFileSync(filename, JSON.stringify({ enabled: true, visibleSurveys: { BARBCO2026: selected } }));
  assert.equal(isWorkshopSurveyVisible("BARBCO2026", selected[0], read()), true);
});

test("config normalization allows new workshop data and rejects malformed lists", () => {
  const future = parseWorkshopVisibility({ enabled: true, visibleSurveys: { " dng ": ["AH-026099", "AH-026099"] } });
  assert.equal(isWorkshopSurveyVisible("DNG", "AH-026099", future), true);
  assert.equal(isWorkshopSurveyVisible("DNG", "AH-026005", future), false);
  for (const input of [null, [], { enabled: "true", visibleSurveys: {} }, { enabled: true }, { enabled: true, visibleSurveys: { DNG: "*" } }, { enabled: true, visibleSurveys: { DNG: [1] } }]) {
    assert.throws(() => parseWorkshopVisibility(input));
  }
});

test("demo multipliers are normalized, local to visible authorized surveys and disabled with workshop mode", () => {
  const input = { enabled: true, visibleSurveys: { BARBCO2026: selected, AMSKARBEMCO: ["AH-026134"], MCS: ["AH-026010"] },
    demoCountMultipliers: { " barbco2026 ": 3.14, amskarbemco: 3.0 } };
  const demo = parseWorkshopVisibility(input);
  const surveys = [{ code: "barbco2026", id: selected[0] }, { code: "BARBCO2026", id: selected[1] }, { code: "AMSKARBEMCO", id: "AH-026134" },
    { code: "MCS", id: "AH-026010" }, { code: "BARBCO2026", id: "hidden" }];
  assert.deepEqual(getWorkshopDemoCountMultipliers(surveys, demo), { [selected[0]]: 3.14, [selected[1]]: 3.14, "AH-026134": 3 });
  assert.deepEqual(getWorkshopDemoCountMultipliers([surveys[2]], demo), { "AH-026134": 3 });
  assert.deepEqual(getWorkshopDemoCountMultipliers(surveys, { ...demo, enabled: false }), {});
  assert.deepEqual(getWorkshopDemoCountMultipliers(surveys, policy), {});
  assert.deepEqual(input.demoCountMultipliers, { " barbco2026 ": 3.14, amskarbemco: 3.0 });
});

test("invalid demo multipliers are rejected without weakening visibility validation", () => {
  for (const value of [null, [], "3.14", { BARBCO2026: "3.14" }, { BARBCO2026: 0 }, { BARBCO2026: -1 }, { BARBCO2026: Infinity }, { BARBCO2026: NaN }, { " ": 3 }]) {
    assert.throws(() => parseWorkshopVisibility({ enabled: true, visibleSurveys: {}, demoCountMultipliers: value }));
  }
});

test("demo multiplier edits are reloaded without a rebuild", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hawks-workshop-demo-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filename = path.join(root, "visibility.json");
  const write = factor => fs.writeFileSync(filename, JSON.stringify({ enabled: true, visibleSurveys: { BARBCO2026: selected }, demoCountMultipliers: { BARBCO2026: factor } }));
  write(3.14);
  const read = createWorkshopVisibilityReader(filename), surveys = [{ code: "BARBCO2026", id: selected[0] }];
  assert.equal(getWorkshopDemoCountMultipliers(surveys, read())[selected[0]], 3.14);
  write(3);
  const later = new Date(Date.now() + 2000); fs.utimesSync(filename, later, later);
  assert.equal(getWorkshopDemoCountMultipliers(surveys, read())[selected[0]], 3);
});
