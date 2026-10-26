export const HEALTHY_BANANA_LABEL = "Banana Plant (Healthy-looking)";
export const INFECTED_BANANA_LABEL = "Banana Plant (Infected)";
export const INVENTORY_BANANA_LABEL = "Banana Plant";
export const COCONUT_TREE_LABEL = "Coconut Tree";

// Exporters vary in spacing, capitalization, and the healthy/unhealthy separator.
const healthyBananaLabel = /^banana\s+plant\s*\(\s*healthy(?:\s*-\s*|\s+)looking\s*\)$/i;
const unhealthyBananaLabel = /^banana\s+plant\s*\(\s*(?:unhealthy(?:\s*-\s*|\s+)looking|infected)\s*\)$/i;
const coconutTreeLabel = /^coconut\s+tree$/i;
const inventoryBananaLabel = /^banana\s+plant$/i;

function normalizeLabel(label: string): string {
  const trimmed = label.trim();
  return healthyBananaLabel.test(trimmed) ? HEALTHY_BANANA_LABEL
    : unhealthyBananaLabel.test(trimmed) ? INFECTED_BANANA_LABEL
    : inventoryBananaLabel.test(trimmed) ? INVENTORY_BANANA_LABEL
    : coconutTreeLabel.test(trimmed) ? COCONUT_TREE_LABEL : label;
}

export function getDetectionPlantType(label: unknown): "banana" | "coconut" | null {
  if (typeof label !== "string") return null;
  const normalized = normalizeLabel(label);
  if (normalized === COCONUT_TREE_LABEL) return "coconut";
  return normalized === INVENTORY_BANANA_LABEL || normalized === HEALTHY_BANANA_LABEL || normalized === INFECTED_BANANA_LABEL
    ? "banana" : null;
}

export function getDetectionPlantName(label: unknown): string {
  const type = getDetectionPlantType(label);
  return type === "coconut" ? "Coconut" : type === "banana" ? "Banana" : "Plant";
}

type DetectionRecord = { label?: unknown; areaCode?: unknown };

/** Use the same position for drawing pins and testing survey coverage. */
export function getDetectionCenter(bbox: {
  cen_lon?: number; cen_lat?: number;
  min_lon?: number; max_lon?: number; min_lat?: number; max_lat?: number;
}) {
  if (bbox.cen_lon !== undefined && bbox.cen_lat !== undefined) return { lon: bbox.cen_lon, lat: bbox.cen_lat };
  if (bbox.min_lon !== undefined && bbox.max_lon !== undefined && bbox.min_lat !== undefined && bbox.max_lat !== undefined) {
    return { lon: (bbox.min_lon + bbox.max_lon) / 2, lat: (bbox.min_lat + bbox.max_lat) / 2 };
  }
  return { lon: 0, lat: 0 };
}

/** Prefer the inventory model per survey; preserve health-only legacy exports. */
export function getPlantDetectionSets<T extends DetectionRecord>(objects: readonly T[]) {
  const normalized = normalizeDetectionLabels(objects);
  const inventorySurveys = new Set(normalized
    .filter(object => object?.label === INVENTORY_BANANA_LABEL)
    .map(object => object.areaCode));
  const inventory: T[] = [];
  const analysis: T[] = [];
  for (const object of normalized) {
    const label = object?.label;
    if (label === INVENTORY_BANANA_LABEL || label === COCONUT_TREE_LABEL) inventory.push(object);
    else if (label === HEALTHY_BANANA_LABEL || label === INFECTED_BANANA_LABEL) {
      analysis.push(object);
      if (!inventorySurveys.has(object.areaCode)) inventory.push(object);
    }
  }
  return { inventory, analysis };
}

export type DemoCountMultipliers = Readonly<Record<string, number>>;

/** Demo scaling changes displayed totals only; filtering and geometry stay raw. */
export function countPlantDetections(objects: readonly DetectionRecord[] = [], demoCountMultipliers?: DemoCountMultipliers) {
  if (demoCountMultipliers && Object.values(demoCountMultipliers).some(factor => Number.isFinite(factor) && factor > 1)) {
    const groups = new Map<string, DetectionRecord[]>();
    for (const object of objects) {
      const id = typeof object?.areaCode === "string" ? object.areaCode : "";
      const group = groups.get(id);
      if (group) group.push(object); else groups.set(id, [object]);
    }
    const result = { healthy: 0, unhealthy: 0, analysisBanana: 0, banana: 0, coconut: 0, total: 0 };
    for (const [id, records] of groups) {
      const counts = countPlantDetections(records);
      const configured = demoCountMultipliers[id];
      const factor = Number.isFinite(configured) && configured >= 1 ? configured : 1;
      const analysis = Math.round(counts.analysisBanana * factor);
      const healthy = Math.round(counts.healthy * factor);
      const total = Math.round(counts.total * factor);
      const coconut = Math.round(counts.coconut * factor);
      result.healthy += healthy;
      result.unhealthy += analysis - healthy;
      result.analysisBanana += analysis;
      result.banana += total - coconut;
      result.coconut += coconut;
      result.total += total;
    }
    return result;
  }
  const { inventory, analysis } = getPlantDetectionSets(objects);
  const healthy = analysis.filter(object => object.label === HEALTHY_BANANA_LABEL).length;
  const unhealthy = analysis.length - healthy;
  const coconut = inventory.filter(object => object.label === COCONUT_TREE_LABEL).length;
  return { healthy, unhealthy, analysisBanana: analysis.length,
    banana: inventory.length - coconut, coconut, total: inventory.length };
}

export function getDemoCountLabel(surveyIds: readonly (string | number)[], factors?: DemoCountMultipliers): string | null {
  const applied = surveyIds.map(id => {
    const factor = factors?.[String(id)];
    return typeof factor === "number" && Number.isFinite(factor) && factor >= 1 ? factor : 1;
  });
  const active = [...new Set(applied.filter(factor => factor > 1))];
  return active.length === 0 ? null : active.length === 1 && applied.every(factor => factor === active[0])
    ? `Demo counts · ×${active[0]}` : "Demo counts · adjusted per survey";
}

/** Species are inventory filters; health classifications apply only to bananas. */
export function resolveDetectionFilter(value: string, mode: string, hasCoconut: boolean): string {
  if (mode === "analysis" && (value === "banana" || value === "coconut")) return "all";
  if (mode === "inventory" && (value === "healthy" || value === "unhealthy")) return "all";
  if ((value === "banana" || value === "coconut") && !hasCoconut) return "all";
  return value;
}

export function filterPlantDetections<T extends DetectionRecord>(
  objects: readonly T[], value: string, mode: string,
): T[] {
  if (!value || value === "none") return [];
  const sets = getPlantDetectionSets(objects);
  return (mode === "inventory" ? sets.inventory : sets.analysis).filter(object => {
    const type = getDetectionPlantType(object.label);
    if (mode === "inventory") return value === "all" || value === type || value === "healthy" || value === "unhealthy";
    const label = object.label;
    return value === "all" || value === "banana" || value === "coconut" ||
      (value === "healthy" && label === HEALTHY_BANANA_LABEL) ||
      (value === "unhealthy" && label === INFECTED_BANANA_LABEL);
  });
}

export function getDetectionKey(object: { areaCode?: unknown; label?: unknown; pairId: string }): string {
  return JSON.stringify([object.areaCode ?? "", typeof object.label === "string" ? normalizeLabel(object.label) : "", object.pairId]);
}

/** Resolve only inside the active mode/filter, including model identity in lookups. */
export function findPlantDetection<T extends DetectionRecord & { pairId: string }>(
  objects: readonly T[], selection: { detectionKey?: unknown; pairId?: unknown; areaCode?: unknown; label?: unknown },
): T | undefined {
  if (typeof selection.detectionKey === "string") {
    return objects.find(object => getDetectionKey(object) === selection.detectionKey);
  }
  if (selection.pairId == null) return undefined;
  return objects.find(object => object.pairId === selection.pairId &&
    (selection.areaCode == null || object.areaCode === selection.areaCode) &&
    (typeof selection.label !== "string" || (typeof object.label === "string" && normalizeLabel(object.label) === normalizeLabel(selection.label))));
}

/** Normalize supported aliases in memory; preserve other labels and all metadata. */
export function normalizeDetectionLabels<T>(objects: readonly T[]): T[] {
  return objects.map((object) => {
    if (!object || typeof object !== "object" || !("label" in object)) return object;
    const label = object.label;
    if (typeof label !== "string") return object;
    const normalized = normalizeLabel(label);
    return normalized === label ? object : { ...object, label: normalized };
  });
}
