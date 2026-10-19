import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import {
  ALL_SURVEYS, getSurveyChoices, getSurveySelectionData, getSurveyLabel,
  getSurveyTileUrl, orderSurveyLayers, sortSurveysById,
} from "../lib/helpers/survey-selection.ts";

import { formatSurveyArea, formatSurveyDate } from "../lib/helpers/survey-format.ts";
import * as detectionLabels from "../lib/helpers/detection-labels.ts";
import { MAP_COLORS } from "../lib/constants/map-colors.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const React = require("react");
const realGeometry = {};
new Function("require", "exports", ts.transpileModule(fs.readFileSync("lib/helpers/geometry.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(name => name === "@/lib/types" ? { GeometryType: { Point: "Point", LineString: "LineString" } }
  : name === "./detection-labels" ? detectionLabels : require(name), realGeometry);
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
    fire(event, value, layer) { listeners.get(event + (layer ? ":" + layer : ""))?.(value); },
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
    selectedFoi: "all", surveyMode: "analysis", popupInfo: null, plantPopupInfo: null, hoveredPairId: null,
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
    "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
    "@/lib/helpers/detection-labels": detectionLabels,
    "@/lib/helpers/geometry": realGeometry,
    "@/lib/types": { GeometryType: { Point: "Point", LineString: "LineString" } },
    "@/lib/helpers/map-zoom": { calculateOptimalZoomLevels: () => ({ heatmapMaxZoom: 17, pinMinZoom: 16.6 }) },
    "@/lib/constants/map-heatmap": { createHeatmapPaint: type => ({ "heatmap-color": type }) },
    "@/lib/constants/map-layers": { createPinLayout: image => ({ "icon-image": image }) },
    "@/lib/helpers/survey-selection": selection,
    "@/lib/helpers/survey-format": { formatSurveyArea, formatSurveyDate },
    "./survey-popup-shell": { SurveyPopupShell: "SurveyPopupShell" },
    "./shared/survey-details-popup": { SurveyDetailsPopup: "SurveyDetailsPopup" },
    "./shared/survey-choice-popup": { SurveyChoicePopup: "SurveyChoicePopup" },
    "@/providers/ortho-map-store-provider": { useOrthoMapStore: (selector) => selector(state) },
    "@/providers/survey-map-store-provider": { useSurveyMapStore: (selector) => selector(state) },
    "@/stores/survey-mode-store": { useSurveyModeStore: () => ({ surveyMode: state.surveyMode }) },
    "@/lib/constants/map-colors": { MAP_COLORS },
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
  const loaded = loadComponents("components/maps/shared/plant-filter-select.tsx");
  const render = runner();
  const detectedObjects = [
    ...Array(39212).fill({ label: "Banana Plant (Healthy-looking)" }),
    ...Array(1111).fill({ label: "Banana Plant (Infected)" }),
  ];
  const view = (objects = detectedObjects) => render.render(loaded.exports.PlantFilterSelect, { detectedObjects: objects, mode: "analysis", value: loaded.state.selectedFoi, onValueChange: loaded.state.setSelectedFoi });
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

const stmDetections = [
  { label: "Coconut Tree", areaCode: "AH-026132", pairId: "1", areaPairId: "1" },
  { label: "Coconut Tree", areaCode: "AH-026128", pairId: "1", areaPairId: "1" },
  { label: "Banana Plant (Healthy-looking)", areaCode: "AH-026132", pairId: "2", areaPairId: "2" },
  { label: "Banana Plant (Infected)", areaCode: "AH-026132", pairId: "3", areaPairId: "3" },
].map((object, i) => ({ ...object, bbox: { min_lon: 125 + i * .001, max_lon: 125.0002 + i * .001, min_lat: 7, max_lat: 7.0002, cen_lon: 125.0001 + i * .001, cen_lat: 7.0001 } }));

test("inventory selectors expose Banana/Coconut only with matching data and keep analysis banana-only", () => {
  const loaded = loadComponents("components/maps/shared/plant-filter-select.tsx");
  const render = runner();
  const view = (mode, value, objects = stmDetections) => render.render(loaded.exports.PlantFilterSelect, {
    mode, value, detectedObjects: objects, onValueChange: loaded.state.setSelectedFoi,
  });
  const items = tree => nodes(tree).filter(node => node.type === "SelectItem").map(node => node.props.value);
  let tree = view("inventory", "all");
  assert.deepEqual(items(tree), ["none", "banana", "coconut", "all"]);
  assert.equal(text(find(find(tree, "SelectTrigger"), "Badge")), "4");
  tree = view("inventory", "coconut");
  assert.equal(text(find(tree, "SelectValue")), "Coconut");
  assert.equal(text(find(find(tree, "SelectTrigger"), "Badge")), "2");
  find(tree, "Select").props.onValueChange("banana");
  assert.equal(loaded.state.selectedFoi, "banana");
  tree = view("analysis", "coconut");
  assert.deepEqual(items(tree), ["none", "healthy", "unhealthy", "all"]);
  assert.equal(find(tree, "Select").props.value, "all");
  assert.equal(text(find(find(tree, "SelectTrigger"), "Badge")), "2");
  tree = view("inventory", "coconut", stmDetections.slice(2));
  assert.deepEqual(items(tree), ["none", "all"], "banana-only clients keep their existing choices");
  assert.equal(find(tree, "Select").props.value, "all");
});

test("both map selectors clear stale coconut popups/hover and reset filters when mode or available species changes", () => {
  for (const [file, exportName] of [["components/maps/ortho-map.tsx", "OrthomapFoiSelector"], ["components/selectors/foi-selector.tsx", "FoiSelector"]]) {
    const loaded = loadComponents(file, exportName === "OrthomapFoiSelector" ? "\nexport { OrthomapFoiSelector };" : "");
    loaded.state.surveyMode = "inventory";
    loaded.state.selectedFoi = "coconut";
    const render = runner();
    render.render(loaded.exports[exportName], { detectedObjects: stmDetections }); render.effects();
    loaded.state.surveyMode = "analysis";
    loaded.state.hoveredPairId = "AH-026132:1";
    loaded.state.popupInfo = loaded.state.plantPopupInfo = { pairId: "1", label: "Coconut Tree" };
    let tree = render.render(loaded.exports[exportName], { detectedObjects: stmDetections }); render.effects();
    assert.equal(tree.props.value, "all");
    assert.equal(loaded.state.selectedFoi, "all");
    assert.equal(loaded.state.hoveredPairId, null);
    assert.equal(exportName === "FoiSelector" ? loaded.state.popupInfo : loaded.state.plantPopupInfo, null);
    loaded.state.surveyMode = "inventory";
    loaded.state.selectedFoi = "coconut";
    tree = render.render(loaded.exports[exportName], { detectedObjects: stmDetections.slice(2) }); render.effects();
    assert.equal(tree.props.value, "all");
  }
});

test("both maps isolate inventory species, preserve survey identity and exclude coconut geometry from analysis", () => {
  for (const file of ["components/maps/ortho-map.tsx", "components/maps/survey-map.tsx"]) {
    const loaded = loadComponents(file, "\nexport { FeaturesOfInterest };\n");
    const render = runner();
    const props = { code: "STM", survey: { id: "AH-026132" }, detectedObjects: stmDetections };
    loaded.state.surveyMode = "inventory";
    let tree = render.render(loaded.exports.FeaturesOfInterest, props);
    let inventory = find(tree, "InventoryLayers");
    assert.equal(inventory.props.data.features.length, 4);
    assert.deepEqual(inventory.props.data.features.map(f => f.properties.detectionKey).sort(), stmDetections.map(detectionLabels.getDetectionKey).sort());
    loaded.state.selectedFoi = "coconut";
    tree = render.render(loaded.exports.FeaturesOfInterest, props);
    inventory = find(tree, "InventoryLayers");
    assert.equal(inventory.props.data.features.length, 2);
    assert.ok(inventory.props.data.features.every(f => f.properties.plantType === "coconut"));
    loaded.state.hoveredPairId = detectionLabels.getDetectionKey(stmDetections[1]);
    tree = render.render(loaded.exports.FeaturesOfInterest, props);
    const highlight = nodes(tree).find(n => n.type === "Layer" && n.props.id?.endsWith("-selected-bbox-fill"));
    assert.equal(highlight.props.paint["fill-color"], MAP_COLORS.coconut.base);
    const bbox = nodes(tree).find(n => n.type === "Source" && n.props.id?.endsWith("-selected-bbox"));
    assert.equal(bbox.props.data.features[0].geometry.coordinates[0][0][0], stmDetections[1].bbox.min_lon, "repeated pair IDs must highlight the hovered survey");
    loaded.state.surveyMode = "analysis";
    tree = render.render(loaded.exports.FeaturesOfInterest, props);
    assert.equal(find(tree, "InventoryLayers"), undefined);
    assert.equal(nodes(tree).find(n => n.type === "Source" && n.props.id?.endsWith("-selected-bbox")), undefined);
    const data = nodes(tree).filter(n => n.type === "Source").flatMap(n => n.props.data?.features ?? []);
    assert.equal(data.length, 4, "one healthy and one infected point in each heatmap/pin source");
    assert.ok(data.every(f => !f.properties.label?.includes("Coconut")));
  }
});

test("inventory pins and density colors distinguish coconut; labels do not rely on color alone", () => {
  const loaded = loadComponents("components/maps/shared/inventory-layers.tsx");
  const data = realGeometry.generateInventoryFeatureCollection(stmDetections, "all");
  const tree = runner().render(loaded.exports.InventoryLayers, { id: "STM", data, zoomLevels: { heatmapMaxZoom: 17, pinMinZoom: 16.6 } });
  const layers = nodes(tree).filter(n => n.type === "Layer");
  assert.equal(layers.length, 3);
  assert.deepEqual(layers.find(n => n.props.type === "symbol").props.layout["icon-image"], ["match", ["get", "plantType"], "coconut", "pin-coconut", "pin-gray"]);
  assert.deepEqual(layers.find(n => n.props.id === "STM-coconut-heatmap").props.filter, ["==", ["get", "plantType"], "coconut"]);
  assert.notEqual(MAP_COLORS.coconut.base, MAP_COLORS.inventory.base);
  const legend = loadComponents("components/maps/shared/inventory-legend.tsx");
  const result = runner().render(legend.exports.InventoryLegend, { detectedObjects: stmDetections });
  assert.match(text(result), /Banana.*Coconut/);
  assert.equal(runner().render(legend.exports.InventoryLegend, { detectedObjects: stmDetections.slice(2) }), null);
  const popup = loadComponents("components/maps/ortho-map.tsx", "\nexport { PlantPopup };\n");
  popup.state.surveyMode = "inventory";
  popup.state.plantPopupInfo = { centerLng: 125, centerLat: 7, label: "Coconut Tree" };
  assert.match(text(runner().render(popup.exports.PlantPopup)), /Plant type:Coconut/);
});

const combinedModelDetections = [
  { label: "Banana Plant (Healthy-looking)", areaCode: ids[0], pairId: "1" },
  { label: "Banana Plant (Infected)", areaCode: ids[0], pairId: "2" },
  { label: "Banana Plant", areaCode: ids[0], pairId: "1" },
  { label: "Banana Plant", areaCode: ids[0], pairId: "2" },
  { label: "Banana Plant", areaCode: ids[0], pairId: "3" },
  { label: "Coconut Tree", areaCode: ids[0], pairId: "4" },
  { label: "Banana Plant (Healthy-looking)", areaCode: ids[1], pairId: "1" },
].map((object, i) => ({ ...object, areaPairId: object.pairId,
  bbox: { min_lon: 125 + i * .001, max_lon: 125.0002 + i * .001, min_lat: 7, max_lat: 7.0002 } }));

test("mode dropdown counts match selected geometry for combined models, legacy fallback and survey isolation", () => {
  const selector = loadComponents("components/maps/shared/plant-filter-select.tsx");
  for (const file of ["components/maps/ortho-map.tsx", "components/maps/survey-map.tsx"]) {
    const loaded = loadComponents(file, "\nexport { FeaturesOfInterest };\n");
    const objects = file.includes("ortho-map") ? combinedModelDetections
      : getSurveySelectionData(surveys, combinedModelDetections, ids[0]).detectedObjects;
    for (const [mode, expected] of [["inventory", file.includes("ortho-map") ? 5 : 4], ["analysis", file.includes("ortho-map") ? 3 : 2]]) {
      loaded.state.surveyMode = mode;
      const tree = runner().render(loaded.exports.FeaturesOfInterest, { code: "MCS", survey: surveys[0], detectedObjects: objects });
      const control = runner().render(selector.exports.PlantFilterSelect, { mode, value: "all", detectedObjects: objects, onValueChange() {} });
      assert.equal(text(find(find(control, "SelectTrigger"), "Badge")), String(expected));
      if (mode === "inventory") {
        const features = find(tree, "InventoryLayers").props.data.features;
        assert.equal(features.length, expected);
        assert.ok(features.filter(f => f.properties.areaCode === ids[0]).every(f => ["Banana Plant", "Coconut Tree"].includes(f.properties.label)));
      } else {
        const sources = nodes(tree).filter(n => n.type === "Source" && /-(healthy|unhealthy)-pins$/.test(n.props.id));
        const features = sources.flatMap(source => source.props.data.features);
        assert.equal(features.length, expected);
        assert.ok(features.every(f => ["Banana Plant (Healthy-looking)", "Banana Plant (Infected)"].includes(f.properties.label)));
      }
    }
  }
});

test("both map click handlers resolve repeated model IDs inside the active mode and highlight its actual box", () => {
  const objects = combinedModelDetections.filter(row => row.areaCode === ids[0]);
  for (const [file, eventName, prefix] of [["components/maps/ortho-map.tsx", "MapEvents", "MCS"], ["components/maps/survey-map.tsx", "SurveyMapEvents", ids[0]]]) {
    const loaded = loadComponents(file, `\nexport { ${eventName}, FeaturesOfInterest };\n`);
    const events = runner(), layers = runner();
    const props = { code: "MCS", survey: surveys[0], surveys: [surveys[0]], detectedObjects: objects, showBoundaries: true, isOverview: false, onChooseSurvey() {} };
    const popup = () => eventName === "MapEvents" ? loaded.state.plantPopupInfo : loaded.state.popupInfo;
    for (const [mode, index, layer] of [["inventory", 2, `${prefix}-inventory-pin`], ["analysis", 0, `${prefix}-healthy-pin`]]) {
      loaded.state.surveyMode = mode;
      loaded.state.popupInfo = loaded.state.plantPopupInfo = null;
      events.render(loaded.exports[eventName], props); events.effects();
      const object = objects[index];
      const properties = { pairId: object.pairId, areaCode: object.areaCode, label: object.label, detectionKey: detectionLabels.getDetectionKey(object) };
      loaded.map.fire("click", { features: [{ properties }] }, layer);
      assert.equal(popup().label, object.label);
      assert.equal(popup().centerLng, (object.bbox.min_lon + object.bbox.max_lon) / 2);
      assert.equal(popup().detectionKey, properties.detectionKey);
      const tree = layers.render(loaded.exports.FeaturesOfInterest, props);
      const source = nodes(tree).find(n => n.type === "Source" && n.props.id?.endsWith("-selected-bbox"));
      assert.equal(source.props.data.features[0].geometry.coordinates[0][0][0], object.bbox.min_lon);
      loaded.state.popupInfo = loaded.state.plantPopupInfo = null;
      const excluded = objects[mode === "inventory" ? 0 : 2];
      loaded.map.fire("click", { features: [{ properties: { pairId: excluded.pairId, detectionKey: detectionLabels.getDetectionKey(excluded) } }] }, layer);
      assert.equal(popup(), null, "inactive model IDs must not open a popup");
    }
  }
});

test("dashboard and survey summaries use separate inventory and analysis totals and percentages", () => {
  const dashboard = loadComponents("components/section-cards.tsx");
  dashboard.state.surveyMode = "inventory";
  let tree = runner().render(dashboard.exports.SectionCards, { surveys, detectedObjects: combinedModelDetections });
  let cards = nodes(tree).filter(node => node.type?.name === "StatCard");
  const inventory = cards.find(card => card.props.title === "Total Plants");
  assert.equal(inventory.props.value, "5");
  assert.equal(text(inventory.props.footerContent), "Banana: 4 · Coconut: 1");
  dashboard.state.surveyMode = "analysis";
  tree = runner().render(dashboard.exports.SectionCards, { surveys, detectedObjects: combinedModelDetections });
  cards = nodes(tree).filter(node => node.type?.name === "StatCard");
  const healthy = cards.find(card => card.props.title === "Crop Count: Healthy");
  const infected = cards.find(card => card.props.title === "Crop Count: Infected");
  assert.equal(healthy.props.value, "2");
  assert.equal(healthy.props.progress, 2 / 3);
  assert.equal(infected.props.value, "1");
  assert.equal(infected.props.progress, 1 / 3);
  const detail = loadComponents("components/maps/survey-map.tsx", "\nexport { SurveyInfo };\n");
  const objects = combinedModelDetections.filter(row => row.areaCode === ids[0]);
  detail.state.surveyMode = "inventory";
  tree = runner().render(detail.exports.SurveyInfo, { survey: surveys[0], detectedObjects: objects, activeTab: "ortho" });
  assert.match(text(tree), /Plants:4/);
  assert.match(text(tree), /Banana: 3Coconut: 1/);
  detail.state.surveyMode = "analysis";
  tree = runner().render(detail.exports.SurveyInfo, { survey: surveys[0], detectedObjects: objects, activeTab: "ortho" });
  assert.match(text(tree), /Plants:2/);
  assert.doesNotMatch(text(tree), /Coconut/);
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
