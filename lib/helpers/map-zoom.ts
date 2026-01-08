// src/lib/helpers/map-zoom.ts
import { DEFAULT_ZOOM_LEVELS } from "@/lib/constants/map-zoom";

export type ZoomLevels = { heatmapMaxZoom: number; pinMinZoom: number };

function mercatorY(latDeg: number) {
  const lat = (latDeg * Math.PI) / 180;
  // clamp away from poles
  const clamped = Math.min(
    Math.max(lat, -Math.PI / 2 + 1e-6),
    Math.PI / 2 - 1e-6
  );
  return Math.log(Math.tan(Math.PI / 4 + clamped / 2));
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

/**
 * Switches based on *screen overlap*:
 * - heatmap shows when points are so dense their average spacing < overlapPx
 * - pins show when spacing >= overlapPx
 *
 * overlapPx should be something like:
 * - ~24–32 if you want "starts overlapping"
 * - ~14–20 if you want "overlap a LOT before switching"
 */
export function calculateOptimalZoomLevels(
  features: Array<{ geometry?: { coordinates?: [number, number] } }>,
  opts?: {
    minZoom?: number; // map min zoom (e.g. 13)
    maxZoom?: number; // map max zoom (e.g. 23)
    tileSize?: number; // MapLibre world size at z=0 (usually 512)
    maxHeatmapZoom?: number; // optional cap (rarely needed)

    // main knob:
    overlapPx?: number; // smaller => allow denser pins before heatmap
    iconPx?: number; // optional convenience if you prefer overlapFactor
    overlapFactor?: number; // e.g. 0.6 = allow lots of overlap before heatmap
  }
): ZoomLevels {
  const minZoom = opts?.minZoom ?? 13;
  const maxZoom = opts?.maxZoom ?? 23;
  const tileSize = opts?.tileSize ?? 512;

  if (!features?.length) return DEFAULT_ZOOM_LEVELS;

  const coords = features
    .map((f) => f.geometry?.coordinates)
    .filter((c): c is [number, number] => Array.isArray(c) && c.length === 2);

  const n = coords.length;
  if (!n) return DEFAULT_ZOOM_LEVELS;

  let minLon = Infinity,
    maxLon = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  if (![minLon, maxLon, minLat, maxLat].every(Number.isFinite))
    return DEFAULT_ZOOM_LEVELS;

  // Compute bounding box area in *pixels at zoom 0* (worldSize = tileSize)
  const lonSpanDeg = Math.max(1e-9, maxLon - minLon);
  const y1 = mercatorY(minLat);
  const y2 = mercatorY(maxLat);
  const ySpan = Math.max(1e-9, Math.abs(y2 - y1));

  // At zoom0:
  const worldSize0 = tileSize;
  const widthPx0 = (lonSpanDeg / 360) * worldSize0;
  const heightPx0 = (ySpan / (2 * Math.PI)) * worldSize0;
  const areaPx0 = Math.max(1e-9, widthPx0 * heightPx0);

  // Average spacing ~ sqrt(area per point)
  const spacing0 = Math.sqrt(areaPx0 / n);

  // Choose overlap threshold in pixels
  const iconPx = opts?.iconPx ?? 28; // your pin visual footprint
  const overlapFactor = opts?.overlapFactor ?? 0.7; // lower = allow more overlap
  const overlapPx = opts?.overlapPx ?? iconPx * overlapFactor;

  // spacing(z) = spacing0 * 2^z  (because both width+height scale by 2^z)
  // Want heatmap when spacing(z) < overlapPx -> z < log2(overlapPx / spacing0)
  const switchZoom = Math.log2(overlapPx / Math.max(spacing0, 1e-9));

  // heatmap visible for zoom < heatmapMaxZoom
  // pins visible for zoom >= pinMinZoom
  let heatmapMaxZoom = clamp(switchZoom, minZoom, maxZoom - 0.02);

  if (typeof opts?.maxHeatmapZoom === "number") {
    heatmapMaxZoom = Math.min(heatmapMaxZoom, opts.maxHeatmapZoom);
  }

  const pinMinZoom = Math.min(maxZoom, heatmapMaxZoom - 0.4);

  return { heatmapMaxZoom, pinMinZoom };
}
