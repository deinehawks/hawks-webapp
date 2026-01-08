// src/lib/constants/map-layers.ts
import type { ExpressionSpecification } from "maplibre-gl";

/* -------------------------------------------------------------------------- */
/* Shared pin/symbol interpolations                                           */
/* -------------------------------------------------------------------------- */

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

export function createPinLayout(iconImage: string) {
  return {
    "icon-image": iconImage,
    "icon-size": PIN_SIZE_BY_ZOOM,
    "icon-allow-overlap": true,
  } satisfies Record<string, unknown>;
}
