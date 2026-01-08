import type { ExpressionSpecification } from "maplibre-gl";
import { MAP_COLORS, type PlantHealth } from "./map-colors";
export { DEFAULT_ZOOM_LEVELS } from "./map-zoom";

/* -------------------------------------------------------------------------- */
/* Shared zoom interpolations                                                  */
/* -------------------------------------------------------------------------- */

export const HEATMAP_RADIUS_BY_ZOOM: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  8,
  12,
  10,
  14,
  12,
  16,
  15,
  18,
  20,
  20,
  25,
];

export const PIN_SIZE_BY_ZOOM: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  13,
  0.15,
  14,
  0.25,
  15,
  0.3,
  16,
  0.4,
  17,
  0.45,
  18,
  0.5,
  20,
  0.6,
];

export function createHeatmapPaint(type: PlantHealth) {
  const color = MAP_COLORS[type].heatmap;

  return {
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "mag"],
      0,
      0,
      6,
      1,
    ] as ExpressionSpecification,
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      `rgba(${color}, 0)`,
      0.2,
      `rgba(${color}, 0.3)`,
      0.5,
      `rgba(${color}, 0.6)`,
      1,
      `rgba(${color}, 0.9)`,
    ] as ExpressionSpecification,
    "heatmap-radius": HEATMAP_RADIUS_BY_ZOOM,
    "heatmap-opacity": 0.7,
  } satisfies Record<string, unknown>;
}

export function createPinLayout(iconImage: string) {
  return {
    "icon-image": iconImage,
    "icon-size": PIN_SIZE_BY_ZOOM,
    "icon-allow-overlap": true,
  } satisfies Record<string, unknown>;
}
