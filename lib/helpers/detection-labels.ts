export const HEALTHY_BANANA_LABEL = "Banana Plant (Healthy-looking)";
export const INFECTED_BANANA_LABEL = "Banana Plant (Infected)";
export const COCONUT_TREE_LABEL = "Coconut Tree";

// Exporters vary in spacing, capitalization, and the healthy/unhealthy separator.
const healthyBananaLabel = /^banana\s+plant\s*\(\s*healthy(?:\s*-\s*|\s+)looking\s*\)$/i;
const unhealthyBananaLabel = /^banana\s+plant\s*\(\s*(?:unhealthy(?:\s*-\s*|\s+)looking|infected)\s*\)$/i;
const coconutTreeLabel = /^coconut\s+tree$/i;

function normalizeLabel(label: string): string {
  const trimmed = label.trim();
  return healthyBananaLabel.test(trimmed) ? HEALTHY_BANANA_LABEL
    : unhealthyBananaLabel.test(trimmed) ? INFECTED_BANANA_LABEL
    : coconutTreeLabel.test(trimmed) ? COCONUT_TREE_LABEL : label;
}

export function getDetectionPlantType(label: unknown): "banana" | "coconut" | null {
  if (typeof label !== "string") return null;
  const normalized = normalizeLabel(label);
  if (normalized === COCONUT_TREE_LABEL) return "coconut";
  return normalized === HEALTHY_BANANA_LABEL || normalized === INFECTED_BANANA_LABEL
    ? "banana" : null;
}

export function getDetectionPlantName(label: unknown): string {
  const type = getDetectionPlantType(label);
  return type === "coconut" ? "Coconut" : type === "banana" ? "Banana" : "Plant";
}

export function countPlantDetections(objects: readonly { label?: unknown }[] = []) {
  let healthy = 0, unhealthy = 0, coconut = 0;
  for (const object of objects) {
    if (typeof object?.label !== "string") continue;
    const label = normalizeLabel(object.label);
    if (label === HEALTHY_BANANA_LABEL) healthy++;
    else if (label === INFECTED_BANANA_LABEL) unhealthy++;
    else if (label === COCONUT_TREE_LABEL) coconut++;
  }
  const banana = healthy + unhealthy;
  return { healthy, unhealthy, banana, coconut, total: banana + coconut };
}

/** Species are inventory filters; health classifications apply only to bananas. */
export function resolveDetectionFilter(value: string, mode: string, hasCoconut: boolean): string {
  if (mode === "analysis" && (value === "banana" || value === "coconut")) return "all";
  if (mode === "inventory" && (value === "healthy" || value === "unhealthy")) return "all";
  if ((value === "banana" || value === "coconut") && !hasCoconut) return "all";
  return value;
}

export function filterPlantDetections<T extends { label?: unknown }>(
  objects: readonly T[], value: string, mode: string,
): T[] {
  if (!value || value === "none") return [];
  return objects.filter(object => {
    const type = getDetectionPlantType(object?.label);
    if (mode === "inventory") return type !== null &&
      (value === "all" || value === type || value === "healthy" || value === "unhealthy");
    if (type !== "banana" || typeof object.label !== "string") return false;
    const label = normalizeLabel(object.label);
    return value === "all" || value === "banana" || value === "coconut" ||
      (value === "healthy" && label === HEALTHY_BANANA_LABEL) ||
      (value === "unhealthy" && label === INFECTED_BANANA_LABEL);
  });
}

export function getDetectionKey(object: { areaCode: string; pairId: string }): string {
  return `${object.areaCode}:${object.pairId}`;
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
