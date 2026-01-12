// src/lib/constants/map-heatmap.ts
import type { ExpressionSpecification } from "maplibre-gl";
import { MAP_COLORS, type PlantHealth } from "./map-colors";

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

/* export const createHeatmapPaint = (type: "healthy" | "unhealthy") => {
  const isHealthy = type === "healthy";

  return {
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "point_count"],
      0,
      0,
      6,
      1,
    ],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(0, 0, 0, 0)",
      0.2,
      isHealthy ? "rgba(1, 115, 178, 0.2)" : "rgba(222, 143, 5, 0.2)",
      0.4,
      isHealthy ? "rgba(1, 115, 178, 0.4)" : "rgba(222, 143, 5, 0.4)",
      0.6,
      isHealthy ? "rgba(1, 115, 178, 0.6)" : "rgba(222, 143, 5, 0.6)",
      0.8,
      isHealthy ? "rgba(2, 144, 217, 0.8)" : "rgba(245, 166, 35, 0.8)",
      1,
      isHealthy ? "rgba(2, 144, 217, 1)" : "rgba(245, 166, 35, 1)",
    ],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.8, 9, 0.6],
  };
};*/
