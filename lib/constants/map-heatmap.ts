// src/lib/constants/map-heatmap.ts
import type { ExpressionSpecification } from "maplibre-gl";
import { MAP_COLORS, type PlantHealth } from "./map-colors";

/* -------------------------------------------------------------------------- */
/* Shared heatmap interpolations                                              */
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

export function createHeatmapPaint(type: PlantHealth) {
  const color = MAP_COLORS[type].heatmap;

  return {
    // Each point contributes equally (better for “density” heatmap)
    "heatmap-weight": 1 as any,

    // Stronger at lower zoom, weaker when zooming in (so it doesn’t overpower pins)
    "heatmap-intensity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      13,
      1.2,
      16,
      0.9,
      18,
      0.6,
      20,
      0.4,
    ] as ExpressionSpecification,

    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      `rgba(${color}, 0)`,
      0.15,
      `rgba(${color}, 0.20)`,
      0.35,
      `rgba(${color}, 0.45)`,
      0.6,
      `rgba(${color}, 0.75)`,
      1,
      `rgba(${color}, 0.95)`,
    ] as ExpressionSpecification,

    "heatmap-radius": HEATMAP_RADIUS_BY_ZOOM,

    // Fade out as you approach pinMinZoom (prevents a harsh “snap”)
    "heatmap-opacity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      13,
      0.85,
      16,
      0.75,
      18,
      0.55,
      20,
      0.35,
    ] as ExpressionSpecification,
  } satisfies Record<string, unknown>;
}
