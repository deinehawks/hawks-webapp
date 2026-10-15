export const HEALTHY_BANANA_LABEL = "Banana Plant (Healthy-looking)";
export const INFECTED_BANANA_LABEL = "Banana Plant (Infected)";

// Exporters vary in spacing, capitalization, and the healthy/unhealthy separator.
const healthyBananaLabel = /^banana\s+plant\s*\(\s*healthy(?:\s*-\s*|\s+)looking\s*\)$/i;
const unhealthyBananaLabel = /^banana\s+plant\s*\(\s*(?:unhealthy(?:\s*-\s*|\s+)looking|infected)\s*\)$/i;

/** Normalize supported aliases in memory; preserve other labels and all metadata. */
export function normalizeDetectionLabels<T>(objects: readonly T[]): T[] {
  return objects.map((object) => {
    if (!object || typeof object !== "object" || !("label" in object)) return object;
    const label = object.label;
    if (typeof label !== "string") return object;
    const trimmed = label.trim();
    const normalized = healthyBananaLabel.test(trimmed) ? HEALTHY_BANANA_LABEL
      : unhealthyBananaLabel.test(trimmed) ? INFECTED_BANANA_LABEL : label;
    return normalized === label ? object : { ...object, label: normalized };
  });
}
