import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import {
  ALL_SURVEYS, getSurveyChoices, getSurveySelectionData, getSurveyLabel,
  getSurveyTileUrl, orderSurveyLayers, sortSurveysById,
} from "../lib/helpers/survey-selection.ts";

import { formatSurveyArea, formatSurveyDate } from "../lib/helpers/survey-format.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const React = require("react");
const realHelpers = {};
new Function("require", "exports", ts.transpileModule(fs.readFileSync("lib/helpers.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(require, realHelpers);
const ids = ["AH-026010", "AH-026011"];
const surveys = ids.map((id, i) => ({
  id, code: "MCS", access_code: "MCS", area_code: String(301 + i * 10),
  flight_date: "2026-07-01", area: 10 + i * 50, ortho: { tile_folder: "round-corners" },
  min_x: 125, max_x: 126, min_y: 7, max_y: 8,
  boundaries: [["7", "125"], ["7", "126"], ["8", "126"], ["7", "125"]],
  geojson_boundaries: [["125", "7"], ["126", "7"], ["126", "8"], ["125", "7"]],
}));
const detections = [
  { areaCode: ids[0], pairId: "small", label: "Banana Plant (Healthy-looking)" },
  { areaCode: ids[1], pairId: "large", label: "Banana Plant (Infected)" },
  { areaCode: "hidden", pairId: "other" }, { pairId: "unassigned" },
];
const hit = (id) => ({ properties: { survey_id: id } });

test("overlapping hits include every available survey once, independent of drawing order", () => {
  assert.deepEqual(getSurveyChoices([hit(ids[1]), hit(ids[0]), hit(ids[1]), hit("hidden"), {}], surveys), surveys);
  assert.deepEqual(getSurveyChoices([hit(12), hit("12")], [{ id: "12" }, { id: "12" }]), [{ id: "12" }]);
  assert.deepEqual(getSurveyChoices([hit(ids[1])], surveys), [surveys[1]]);
  assert.deepEqual(getSurveyChoices(null, surveys), []);
  assert.deepEqual(getSurveyChoices([], surveys), []);
  const reversed = [...surveys].reverse();
  assert.deepEqual(sortSurveysById(reversed), surveys);
  assert.equal(reversed[0], surveys[1], "sorting must not mutate server data");
});

test("selection defaults/fallbacks isolate one survey and match detections by areaCode", () => {
  for (const requested of ["", "missing", ids[0]]) {
    const data = getSurveySelectionData([...surveys].reverse(), detections, requested);
    assert.equal(data.selection, ids[0]);
    assert.deepEqual(data.surveys, [surveys[0]]);
    assert.deepEqual(data.detectedObjects, [detections[0]]);
  }
  assert.deepEqual(getSurveySelectionData(surveys, detections, ids[1]).detectedObjects, [detections[1]]);
  assert.equal(getSurveySelectionData([surveys[1]], [], ids[0]).selection, ids[1]);
  assert.deepEqual(getSurveySelectionData([], detections, ALL_SURVEYS), { selection: "", surveys: [], detectedObjects: [] });
});

test("overview is ordered and never includes detections outside the available surveys", () => {
  const data = getSurveySelectionData([...surveys].reverse(), detections, ALL_SURVEYS);
  assert.equal(data.selection, ALL_SURVEYS);
  assert.deepEqual(data.surveys, surveys);
  assert.deepEqual(data.detectedObjects, detections.slice(0, 2));
});

test("tile URLs retain survey identity and configured folder without fallback to another survey", () => {
  assert.equal(getSurveyLabel(surveys[0]), "MCS-301");
  assert.match(getSurveyTileUrl(surveys[0]), /mcs\/2026\/AH-026010\/ortho\/round-corners\//);
  assert.match(getSurveyTileUrl({ ...surveys[1], ortho: { tile_folder: "sharp-corners" } }), /AH-026011\/ortho\/sharp-corners\//);
  assert.equal(getSurveyTileUrl({ ...surveys[0], ortho: null }), null);
  assert.equal(getSurveyTileUrl({ ...surveys[0], flight_date: "invalid" }), null);
});

test("layer order is restored after single-to-overview switching and remains stable on style events", () => {
  let layers = ["osm", ids[1], ids[0], "area-fills", "area-labels", "pins", "boundary-glow", "boundary-borders"];
  let moves = 0;
  const map = {
    getStyle: () => ({ layers: layers.map((id) => ({ id })) }),
    getLayer: (id) => layers.includes(id),
    moveLayer(id, before) {
      moves++;
      layers = layers.filter((value) => value !== id);
      if (before) layers.splice(layers.indexOf(before), 0, id); else layers.push(id);
    },
  };
  orderSurveyLayers(map, ids);
  assert.deepEqual(layers, ["osm", ...ids, "area-fills", "pins", "boundary-glow", "boundary-borders", "area-labels"]);
  const completed = moves;
  orderSurveyLayers(map, ids);
  assert.equal(moves, completed, "styledata must not cause an ordering loop");
  layers = ["osm", "area-fills", ids[0], "area-labels"];
  orderSurveyLayers(map, [ids[0], "unmounted"]);
  assert.deepEqual(layers, ["osm", ids[0], "area-fills", "area-labels"]);
});

// Execute the real component functions with hook state and a map adapter.
// This verifies UI callback/data wiring without WebGL, a DOM, or Supabase.
let activeRunner;
function runner() {
  const slots = [];
  let cursor = 0, pending = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  return {
    hooks: {
      useId() { return "test-id-" + cursor++; },
      useState(initial) {
        const index = cursor++;
        if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
        return [slots[index].value, (value) => { slots[index].value = typeof value === "function" ? value(slots[index].value) : value; }];
      },
      useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
      useMemo(fn, deps) {
        const index = cursor++;
        if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: fn(), deps };
        return slots[index].value;
      },
      useCallback(fn, deps) { return this.useMemo(() => fn, deps); },
      useEffect(fn, deps) {
        const index = cursor++;
        if (!slots[index] || !same(slots[index].deps, deps)) {
          const previous = slots[index];
          slots[index] = { deps, cleanup: previous?.cleanup };
          pending.push(() => { previous?.cleanup?.(); slots[index].cleanup = fn(); });
        }
      },
    },
    render(component, props) {
      cursor = 0; pending = []; activeRunner = this;
      try { return component(props); } finally { activeRunner = undefined; }
    },
    effects() { const effects = pending; pending = []; effects.forEach((fn) => fn()); },
  };
}

function mapAdapter() {
  const listeners = new Map();
  return {
    hits: [], pinHits: [], fits: [], flights: [], eases: [], cameraCalls: [],
    getLayer: (id) => id === "area-fills",
    getStyle: () => ({ layers: [{ id: "area-fills" }] }),
    queryRenderedFeatures(_point, options) { return options.layers.includes("area-fills") ? this.hits : this.pinHits; },
    on(event, layer, handler) { listeners.set(event + (typeof layer === "string" ? ":" + layer : ""), handler ?? layer); },
    off(event, layer) { listeners.delete(event + (typeof layer === "string" ? ":" + layer : "")); },
    click() { listeners.get("click")?.({ point: { x: 1, y: 1 }, lngLat: { lng: 125.5, lat: 7.5 } }); },
    fire(event, value) { listeners.get(event)?.(value); },
    fitBounds(bounds, options) { this.fits.push(bounds); this.cameraCalls.push({ type: "fit", bounds, options }); },
    setPadding(padding) { this.cameraCalls.push({ type: "padding", padding }); },
    flyTo(view) { this.flights.push(view); }, easeTo(view) { this.eases.push(view); },
    getMap() { return this; },
    getZoom: () => 15, getCanvas: () => ({ style: {} }),
  };
}

function loadComponents(filename, extraExports = "") {
  const map = mapAdapter();
  const calls = [];
  const state = {
    selectedFoi: "all", popupInfo: null, plantPopupInfo: null, hoveredPairId: null,
    setSelectedFoi: (value) => { state.selectedFoi = value; },
    setPopupInfo: (value) => { calls.push(["popup", value]); state.popupInfo = value; },
    setPlantPopupInfo: (value) => { calls.push(["plant", value]); state.plantPopupInfo = value; },
    setHoveredPairId: (value) => { calls.push(["hover", value]); state.hoveredPairId = value; },
  };
  const hooks = Object.fromEntries(["useState", "useRef", "useMemo", "useCallback", "useEffect", "useId"]
    .map((name) => [name, (...args) => activeRunner.hooks[name](...args)]));
  const helper = {
    ...realHelpers,
    calculateGlobalCenters: () => ({ global_x: 125.5, global_y: 7.5 }),
    transformCoordinatesToLonLatFormat: (coordinates) => coordinates.map(([lat, lng]) => [Number(lng), Number(lat)]),
  };
  const selection = { ALL_SURVEYS, getSurveyChoices, getSurveySelectionData, getSurveyLabel, getSurveyTileUrl, orderSurveyLayers, sortSurveysById };
  const mocks = {
    react: { ...React, ...hooks, memo: (component) => component },
    "@vis.gl/react-maplibre": { Map: "Map", Source: "Source", Layer: "Layer", Popup: "Popup", MapProvider: "MapProvider", useMap: () => ({ orthomap: map, "survey-map": map, current: map }) },
    "@/lib/helpers": helper,
    "@/lib/helpers/survey-selection": selection,
    "@/lib/helpers/survey-format": { formatSurveyArea, formatSurveyDate },
    "./survey-popup-shell": { SurveyPopupShell: "SurveyPopupShell" },
    "./shared/survey-details-popup": { SurveyDetailsPopup: "SurveyDetailsPopup" },
    "./shared/survey-choice-popup": { SurveyChoicePopup: "SurveyChoicePopup" },
    "@/providers/ortho-map-store-provider": { useOrthoMapStore: (selector) => selector(state) },
    "@/providers/survey-map-store-provider": { useSurveyMapStore: (selector) => selector(state) },
    "@/stores/survey-mode-store": { useSurveyModeStore: () => ({ surveyMode: "analysis" }) },
    "@/lib/constants/map-colors": { MAP_COLORS: { boundary: "#0891b2", hover: "#06b6d4" } },
    "@/lib/constants/map-animation": { PIN_ANIMATION_STYLES: "" },
    "framer-motion": { AnimatePresence: "AnimatePresence", motion: new Proxy({}, { get: (_, key) => "motion-" + String(key) }) },
    "maplibre-gl/dist/maplibre-gl.css": {},
    "next/link": { __esModule: true, default: "Link" },
  };
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8") + extraExports, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  new Function("require", "exports", compiled)((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/") || name.startsWith("./")) return new Proxy({}, { get: (_, key) => String(key) });
    return require(name);
  }, exports);
  return { exports, map, state, calls };
}

function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const find = (tree, type) => nodes(tree).find((node) => node.type === type || node.type?.displayName === type);
function text(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  if (Array.isArray(tree)) return tree.map(text).join("");
  return text(tree.props?.children);
}

test("dashboard overlap chooser can open either survey and empty clicks dismiss it", () => {
  const loaded = loadComponents("components/maps/dashboard-map.tsx", "\nexport { MapEvents };");
  const component = loaded.exports.MapEvents;
  const render = runner();
  let popup;
  const props = { data: surveys, setPopupInfo: (value) => { popup = value; } };
  render.render(component, props); render.effects();
  loaded.map.hits = [hit(ids[1]), hit(ids[0]), hit(ids[1])];
  for (const survey of surveys) {
    loaded.map.click();
    const choice = render.render(component, props);
    assert.deepEqual(choice.props.choice.surveys, surveys);
    choice.props.onChoose(survey);
    assert.equal(popup.id, survey.id);
    assert.equal(loaded.map.flights.length > 0, true);
  }
  loaded.map.hits = [];
  loaded.map.click();
  assert.equal(popup, null);
  assert.equal(render.render(component, props), null);
  loaded.map.hits = [hit(ids[1])];
  loaded.map.click();
  assert.equal(popup.id, ids[1], "a single hit opens details immediately");
});

test("orthomap switching updates sources, geometry, detections and identity without replacing the map", () => {
  const { exports: components, state } = loadComponents("components/maps/ortho-map.tsx", "\nexport { OrthoMapContent, MapEvents, RasterTiles, SourceLoadingStatus };");
  const render = runner();
  const props = { userProfile: {}, surveys: [...surveys].reverse(), detectedObjects: detections };
  let tree = render.render(components.OrthoMapContent, props);
  render.effects();
  const check = (id) => {
    const selected = surveys.find((survey) => survey.id === id);
    assert.equal(find(tree, "Select").props.value, id);
    assert.deepEqual(find(tree, "RasterTiles").props.surveys, [selected]);
    assert.deepEqual(find(tree, "FeaturesOfInterest").props.detectedObjects, [detections.find((d) => d.areaCode === id)]);
    assert.deepEqual(find(tree, "OrthomapFoiSelector").props.detectedObjects, [detections.find((d) => d.areaCode === id)]);
    assert.deepEqual(nodes(tree).find((node) => node.type === "Source" && node.props.id === "areas").props.data.features.map((f) => f.properties.survey_id), [id]);
    assert.deepEqual(find(tree, "MapEvents").props.surveys, [selected]);
    const raster = components.RasterTiles(find(tree, "RasterTiles").props);
    const source = find(raster, "Source");
    assert.match(source.props.tiles[0], new RegExp("/" + id + "/"));
    assert.deepEqual(find(tree, "SourceLoadingStatus").props.idList, [id]);
    assert.match(text(tree), /Viewing:/);
    assert.ok(text(tree).includes(id));
    assert.equal(find(tree, "SelectTrigger").props["aria-label"], "Survey");
  };
  check(ids[0]);
  const originalMapType = find(tree, "Map").type;
  const originalMapStyle = find(tree, "Map").props.mapStyle;
  state.plantPopupInfo = { pairId: "stale" }; state.popupInfo = { id: ids[0] }; state.hoveredPairId = "stale";
  find(tree, "Select").props.onValueChange(ids[1]);
  assert.equal(state.popupInfo, null); assert.equal(state.plantPopupInfo, null); assert.equal(state.hoveredPairId, null);
  tree = render.render(components.OrthoMapContent, props); render.effects(); check(ids[1]);
  assert.equal(find(tree, "Map").type, originalMapType);
  assert.equal(find(tree, "Map").props.mapStyle, originalMapStyle, "switches must not replace the base style");
  assert.equal(find(tree, "Map").key, null, "selection must not key/remount the map");
  assert.equal(state.selectedFoi, "all");
  find(tree, "Select").props.onValueChange(ALL_SURVEYS);
  tree = render.render(components.OrthoMapContent, props); render.effects();
  assert.deepEqual(find(tree, "RasterTiles").props.surveys, surveys);
  assert.deepEqual(find(tree, "FeaturesOfInterest").props.detectedObjects, detections.slice(0, 2));
  assert.equal(text(find(tree, "Badge")), "All surveys");
  assert.equal(find(tree, "PopoverContent").props["aria-label"], "Survey images");
  assert.ok(nodes(tree).some((node) => node.props?.["aria-label"] === "Survey images (2)"));
  assert.match(text(find(tree, "PopoverContent")), /side by side or overlap/);
  assert.match(text(find(tree, "PopoverContent")), /If images overlap/);
  assert.match(text(find(tree, "ol")), /In front/);
  assert.ok(text(find(tree, "ol")).indexOf(ids[1]) < text(find(tree, "ol")).indexOf(ids[0]));
  tree = render.render(components.OrthoMapContent, { ...props, surveys: [surveys[0]], detectedObjects: [] });
  assert.deepEqual(find(tree, "FeaturesOfInterest").props.detectedObjects, []);
  assert.match(text(components.default({ ...props, surveys: [] })), /No Survey Data Available/);
});

test("orthomap boundary chooser isolates a chosen survey and respects the boundary toggle", () => {
  const loaded = loadComponents("components/maps/ortho-map.tsx", "\nexport { MapEvents };");
  const render = runner();
  let selected;
  let props = { surveys, detectedObjects: [], code: "MCS", showBoundaries: true, isOverview: true, onChooseSurvey: (id) => { selected = id; } };
  render.render(loaded.exports.MapEvents, props); render.effects();
  loaded.map.hits = [hit(ids[1]), hit(ids[0])];
  loaded.map.click();
  let choice = render.render(loaded.exports.MapEvents, props);
  choice.props.onChoose(surveys[0]);
  assert.equal(selected, ids[0]);
  props = { ...props, showBoundaries: false };
  render.render(loaded.exports.MapEvents, props); render.effects();
  loaded.map.click();
  assert.equal(render.render(loaded.exports.MapEvents, props), null);
});

test("survey fitting clears popup padding and moves directly to the selected bounds without a flight", () => {
  const loaded = loadComponents("components/maps/ortho-map.tsx", "\nexport { ActiveSurveyView, MapEvents };\n");
  const render = runner();
  const bounds = [[125, 7], [125.01, 7.01]];
  const props = { bounds, rasterIds: [] };
  render.render(loaded.exports.ActiveSurveyView, props); render.effects();
  assert.deepEqual(loaded.map.cameraCalls, [
    { type: "padding", padding: { top: 0, bottom: 0, left: 0, right: 0 } },
    { type: "fit", bounds, options: { padding: 24, duration: 600, maxZoom: 20, linear: true } },
  ]);
  render.render(loaded.exports.ActiveSurveyView, props); render.effects();
  assert.equal(loaded.map.fits.length, 1, "panning or unrelated renders must not refit the same survey");
  const nextBounds = [[126, 8], [126.01, 8.01]];
  render.render(loaded.exports.ActiveSurveyView, { ...props, bounds: nextBounds }); render.effects();
  assert.equal(loaded.map.fits.length, 2);
  assert.equal(loaded.map.fits[1], nextBounds);

  const events = runner();
  events.render(loaded.exports.MapEvents, { surveys, detectedObjects: [], code: "MCS", showBoundaries: true, isOverview: false, onChooseSurvey() {} });
  events.effects(); loaded.map.hits = [hit(ids[0])]; loaded.map.click();
  assert.equal(loaded.state.popupInfo.id, ids[0]);
  assert.equal(loaded.map.flights.length, 0);
  assert.equal(loaded.map.eases[0].zoom, 16);
  assert.deepEqual(loaded.map.eases[0].offset, [0, 80]);
  assert.equal(loaded.map.eases[0].padding, undefined, "popup placement must not persist camera padding");
});

test("crop status keeps the complete count separate from the selected label and updates on filtering", () => {
  const loaded = loadComponents("components/maps/ortho-map.tsx", "\nexport { OrthomapFoiSelector };\n");
  const render = runner();
  const detectedObjects = [
    ...Array(39212).fill({ label: "Banana Plant (Healthy-looking)" }),
    ...Array(1111).fill({ label: "Banana Plant (Infected)" }),
  ];
  const view = (objects = detectedObjects) => render.render(loaded.exports.OrthomapFoiSelector, { detectedObjects: objects });
  let tree = view();
  let trigger = find(tree, "SelectTrigger");
  assert.equal(text(find(trigger, "SelectValue")), "All plants");
  assert.equal(text(find(trigger, "Badge")), "40,323");
  assert.equal(find(trigger, "Badge").props["aria-label"], "40,323 plants");
  assert.match(find(trigger, "Badge").props.className, /shrink-0/);
  find(tree, "Select").props.onValueChange("healthy");
  tree = view(); trigger = find(tree, "SelectTrigger");
  assert.equal(text(find(trigger, "SelectValue")), "Healthy");
  assert.equal(text(find(trigger, "Badge")), "39,212");
  loaded.state.selectedFoi = "unhealthy";
  tree = view(); assert.equal(text(find(find(tree, "SelectTrigger"), "Badge")), "1,111");
  tree = view([]); assert.equal(text(find(find(tree, "SelectTrigger"), "Badge")), "0");
  loaded.state.selectedFoi = "none";
  tree = view(); assert.equal(find(find(tree, "SelectTrigger"), "Badge"), undefined);
});

test("individual survey opening uses real boundary bounds, with coordinate and tile fallbacks", () => {
  const loaded = loadComponents("components/maps/survey-map.tsx", "\nexport { useMapBounds, useMapCenter, MapView };\n");
  const boundarySurvey = { ...surveys[0], geojson_boundaries: [["125.73", "7.56"], ["125.74", "7.57"]] };
  const render = runner();
  let bounds = render.render(loaded.exports.useMapBounds, boundarySurvey);
  assert.deepEqual(bounds, [125.73, 7.56, 125.74, 7.57], "bounds must use the helper's array result");
  const fallback = { lng: 1, lat: 1, zoom: 13 };
  // Invoke the two-argument hook through a component wrapper.
  const derivedCenter = runner().render(() => loaded.exports.useMapCenter({ ...boundarySurvey, min_x: undefined, max_x: undefined, min_y: undefined, max_y: undefined }, fallback));
  assert.ok(Math.abs(derivedCenter.lng - 125.735) < 1e-9);
  assert.ok(Math.abs(derivedCenter.lat - 7.565) < 1e-9);
  bounds = render.render(loaded.exports.useMapBounds, { ...surveys[0], geojson_boundaries: [] });
  assert.deepEqual(bounds, [125, 7, 126, 8]);
  bounds = render.render(loaded.exports.useMapBounds, { min_x: 999, min_y: 7, tile_min_x: 124, tile_max_x: 125, tile_min_y: 6, tile_max_y: 7 });
  assert.deepEqual(bounds, [124, 6, 125, 7], "partial original coordinates must not override complete tile bounds");
  assert.equal(render.render(loaded.exports.useMapBounds, {}), undefined);

  const view = runner();
  const props = { survey: boundarySurvey, mapCenter: derivedCenter, mapBounds: [125.73, 7.56, 125.74, 7.57], detectedObjects: [], hasValidCoordinates: true, hasOrthoTiles: true, surveyMode: "analysis" };
  let tree = view.render(loaded.exports.MapView, props); view.effects();
  assert.deepEqual(tree.props.initialViewState, { bounds: props.mapBounds, fitBoundsOptions: { padding: 24, maxZoom: 20 } });
  assert.equal(tree.props.maxZoom, 23, "users retain the existing manual zoom range");
  assert.equal(loaded.map.fits.length, 0, "initialViewState fits once without interrupting raster setup");
  view.render(loaded.exports.MapView, { ...props, surveyMode: "inventory" }); view.effects();
  assert.equal(loaded.map.fits.length, 0, "changing overlay mode must not reset the user's zoom");
});


test("loading status follows active sources, reports their errors and resets on switching", () => {
  const loaded = loadComponents("components/maps/ortho-map.tsx", "\nexport { SourceLoadingStatus };");
  const render = runner();
  let available = false, complete = false;
  loaded.map.getSource = () => available ? {} : undefined;
  loaded.map.isSourceLoaded = () => complete;
  let props = { idList: [ids[0]] };
  const view = () => text(render.render(loaded.exports.SourceLoadingStatus, props));
  view(); render.effects();
  assert.match(view(), /Loading imagery/);
  available = true; complete = true; loaded.map.fire("sourcedata");
  assert.match(view(), /Ready/);
  loaded.map.fire("error", { sourceId: "osm" });
  assert.match(view(), /Ready/);
  loaded.map.fire("error", { sourceId: ids[0] });
  assert.match(view(), /Some imagery unavailable/);
  props = { idList: [ids[1]] }; complete = false;
  view(); render.effects(); assert.match(view(), /Loading imagery/);
  loaded.map.fire("error", { sourceId: ids[0] });
  assert.match(view(), /Loading imagery/);
  complete = true; loaded.map.fire("idle"); assert.match(view(), /Ready/);
  props = { idList: [] }; view(); render.effects(); assert.match(view(), /No imagery/);
});

test("chooser rows identify surveys with date/area and remain usable with missing metadata", () => {
  const loaded = loadComponents("components/maps/shared/survey-choice-popup.tsx");
  let chosen;
  const choice = { longitude: 125, latitude: 7, surveys: [surveys[0], { id: "minimal", flight_date: "bad", area: null }] };
  const tree = loaded.exports.SurveyChoicePopup({ choice, onChoose: (survey) => { chosen = survey; }, onClose: () => {} });
  const buttons = nodes(tree).filter((node) => node.type === "Button");
  assert.equal(buttons.length, 2);
  assert.match(text(buttons[0]), /AH-026010/);
  assert.match(text(buttons[0]), /MCS-301/);
  assert.match(text(buttons[0]), /01 Jul 2026/);
  assert.match(text(buttons[0]), /10.00 ha/);
  assert.match(text(buttons[1]), /minimal/);
  assert.ok(!text(buttons[1]).includes("Invalid"));
  assert.equal(buttons[0].props.variant, "ghost");
  buttons[1].props.onClick(); assert.equal(chosen.id, "minimal");
});


test("survey metadata formats consistently and never turns missing areas into zero", () => {
  assert.equal(formatSurveyDate("2026-06-02"), "02 Jun 2026");
  assert.equal(formatSurveyDate("not-a-date"), "—");
  assert.equal(formatSurveyDate(null), "—");
  assert.equal(formatSurveyArea("19"), "19.00 ha");
  assert.equal(formatSurveyArea(0), "0.00 ha");
  for (const area of [null, undefined, "", " ", -2, NaN]) assert.equal(formatSurveyArea(area), "—");
});

test("shared details have primary survey identity, wrapping metadata and one link action", () => {
  const { exports: components } = loadComponents("components/maps/shared/survey-details-popup.tsx");
  const survey = { ...surveys[0], flight_date: "2026-06-02", location: "A long location name that must remain readable", tags: "RGB" };
  const tree = components.SurveyDetailsPopup({ survey, longitude: 125, latitude: 7, onClose() {} });
  assert.equal(tree.type, "SurveyPopupShell");
  assert.equal(tree.props.title, ids[0]);
  assert.equal(tree.props.description, "MCS-301");
  assert.match(text(tree), /02 Jun 2026/);
  assert.match(text(tree), /A long location name/);
  const action = tree.props.footer;
  assert.equal(action.props.asChild, true);
  assert.equal(action.props.children.type, "Link");
  assert.equal(action.props.children.props.href, "/dashboard/surveys/" + ids[0]);
  assert.match(text(action), /View details/);
});

test("shared popup exposes an accessible dialog and Escape closes it without passing keys to the map", () => {
  const { exports: components } = loadComponents("components/maps/shared/survey-popup-shell.tsx");
  const render = runner();
  let closed = 0, stopped = 0, prevented = 0;
  const tree = render.render(components.SurveyPopupShell, { longitude: 125, latitude: 7, title: "Choose survey", children: "rows", onClose() { closed++; } });
  assert.equal(tree.props.closeButton, false);
  assert.equal(tree.props.focusAfterOpen, false);
  assert.equal(tree.props.className, "survey-map-popup");
  const dialog = nodes(tree).find((node) => node.props?.role === "dialog");
  assert.ok(dialog.props["aria-labelledby"]);
  dialog.props.onKeyDown({ key: "Escape", stopPropagation() { stopped++; }, preventDefault() { prevented++; } });
  assert.equal(closed, 1); assert.equal(stopped, 1); assert.equal(prevented, 1);
  const close = nodes(tree).find((node) => node.props?.["aria-label"] === "Close survey popup");
  close.props.onClick(); assert.equal(closed, 2);
});

test("header boundaries toggle remains explicit and its state does not change selection", () => {
  const loaded = loadComponents("components/maps/ortho-map.tsx", "\nexport { OrthoMapContent };");
  const render = runner();
  const props = { surveys, detectedObjects: [], userProfile: {} };
  let tree = render.render(loaded.exports.OrthoMapContent, props);
  const boundary = nodes(tree).find((node) => node.type === "Button" && typeof node.props["aria-pressed"] === "boolean");
  assert.equal(boundary.props["aria-pressed"], false);
  boundary.props.onClick();
  tree = render.render(loaded.exports.OrthoMapContent, props);
  const active = nodes(tree).find((node) => node.type === "Button" && typeof node.props["aria-pressed"] === "boolean");
  assert.equal(active.props["aria-pressed"], true);
  assert.equal(find(tree, "Select").props.value, ids[0]);
  assert.equal(find(tree, "MapEvents").props.showBoundaries, true);
});
