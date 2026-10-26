import type { Polygon, MultiPolygon, Position } from "geojson";

export type SurveyFootprint = {
  id: string | number;
  geometry?: Polygon | MultiPolygon | null;
};

type Ring = { coordinates: readonly Position[]; bounds: readonly number[] };
type PreparedPolygon = { outer: Ring; holes: Ring[] };
const EDGE_EPSILON = 1e-10;

function prepareRing(coordinates: readonly Position[]): Ring | null {
  if (coordinates.length < 3 || coordinates.some(p => p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, area = 0;
  const [originX, originY] = coordinates[0];
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const [x, y] = coordinates[i], [previousX, previousY] = coordinates[j];
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    area += (previousX - originX) * (y - originY) - (x - originX) * (previousY - originY);
  }
  return Math.abs(area) <= EDGE_EPSILON ** 2 ? null : { coordinates, bounds: [minX, minY, maxX, maxY] };
}

function insideBounds(x: number, y: number, bounds: readonly number[]) {
  return x >= bounds[0] - EDGE_EPSILON && x <= bounds[2] + EDGE_EPSILON &&
    y >= bounds[1] - EDGE_EPSILON && y <= bounds[3] + EDGE_EPSILON;
}

/** Even/odd ray crossings, with an explicit boundary result for stable ties. */
function classifyRing(x: number, y: number, ring: Ring): "inside" | "outside" | "edge" {
  if (!insideBounds(x, y, ring.bounds)) return "outside";
  let inside = false;
  const points = ring.coordinates;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[j], [bx, by] = points[i];
    const dx = bx - ax, dy = by - ay;
    const length = Math.hypot(dx, dy);
    if (length > 0 && Math.abs((x - ax) * dy - (y - ay) * dx) <= EDGE_EPSILON * length &&
      x >= Math.min(ax, bx) - EDGE_EPSILON && x <= Math.max(ax, bx) + EDGE_EPSILON &&
      y >= Math.min(ay, by) - EDGE_EPSILON && y <= Math.max(ay, by) + EDGE_EPSILON) return "edge";
    if ((ay > y) !== (by > y) && x < ax + (y - ay) * dx / dy) inside = !inside;
  }
  return inside ? "inside" : "outside";
}

function containsPoint(polygon: PreparedPolygon, x: number, y: number) {
  const outer = classifyRing(x, y, polygon.outer);
  if (outer === "outside") return false;
  if (outer === "edge") return true;
  for (const hole of polygon.holes) {
    const result = classifyRing(x, y, hole);
    if (result === "edge") return true;
    if (result === "inside") return false;
  }
  return true;
}

/**
 * Prepare once per imagery selection. Input order is bottom-to-top, matching
 * raster drawing order. A survey without a usable boundary never hides others.
 * Coverage is independent of model availability, crop filters and viewport.
 */
export function createSurveyPriorityMask(footprints: readonly SurveyFootprint[]) {
  const prepared = footprints.map(({ id, geometry }) => {
    const coordinates = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.coordinates ?? [];
    const polygons: PreparedPolygon[] = [];
    for (const rings of coordinates) {
      const outer = rings[0] && prepareRing(rings[0]);
      const holes = rings.slice(1).map(prepareRing);
      if (outer && holes.every((hole): hole is Ring => hole !== null)) polygons.push({ outer, holes });
    }
    return { id: String(id), polygons };
  });
  const ranks = new Map(prepared.map((survey, index) => [survey.id, index]));
  return (surveyId: unknown, x: number, y: number): boolean => {
    const rank = typeof surveyId === "string" || typeof surveyId === "number" ? ranks.get(String(surveyId)) : undefined;
    if (rank === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    for (let i = prepared.length - 1; i > rank; i--) {
      if (prepared[i].polygons.some(polygon => containsPoint(polygon, x, y))) return false;
    }
    return true;
  };
}
