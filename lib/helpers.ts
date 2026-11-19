import { Feature, FeatureCollection, Position } from "geojson";

import { parseISO, isBefore, isAfter, getYear } from "date-fns";
import { LngLatBoundsLike, LngLatLike } from "maplibre-gl";
import { ComputerVisionObject } from "./types";

export type AnyObject = Record<string, unknown>;

type MinMaxCoordinateLike = {
  min_x: number | string;
  max_x: number | string;
  min_y: number | string;
  max_y: number | string;
};

export function filterNonEmpty(
  obj: AnyObject,
  keyToRemove?: string
): AnyObject {
  return Object.keys(obj).reduce((acc, key) => {
    if (
      key !== keyToRemove &&
      obj[key] !== null &&
      obj[key] !== undefined &&
      obj[key] !== ""
    ) {
      acc[key] = obj[key];
    }
    return acc;
  }, {} as AnyObject);
}

export function transformNullToEmptyString<T extends Record<string, unknown>>(
  obj: T,
): T {
  const transformedObj = {} as Record<keyof T, unknown>;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const typedKey = key as keyof T;
      const value = obj[typedKey];
      transformedObj[typedKey] = value === null ? "" : value;
    }
  }

  return transformedObj as T;
}

export function calculateGlobalCenters<T extends MinMaxCoordinateLike>(data: T[]): {
  global_x: number;
  global_y: number;
} {
  if (data.length === 0) {
    throw new Error("No available data to process.");
  }

  let sum_x = 0;
  let sum_y = 0;

  data.forEach((obj) => {
    const center_x = (Number(obj.min_x) + Number(obj.max_x)) / 2;
    const center_y = (Number(obj.min_y) + Number(obj.max_y)) / 2;

    sum_x += center_x;
    sum_y += center_y;
  });

  const global_x = sum_x / data.length;
  const global_y = sum_y / data.length;

  return { global_x, global_y };
}

export function transformCoordinatesToLonLatFormat(
  coordinates: string[][]
): Position[] {
  return coordinates.map((pair) => [parseFloat(pair[1]), parseFloat(pair[0])]);
}

export function getEarliestandLatestDates<
  T extends Record<string, unknown>,
>(data: T[], dateField: keyof T & string) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { earliest: null, latest: null };
  }

  const firstValue = data[0]?.[dateField];
  if (typeof firstValue !== "string" || !firstValue) {
    return { earliest: null, latest: null };
  }

  let earliest = parseISO(firstValue);
  let latest = parseISO(firstValue);

  data.forEach((item) => {
    const value = item?.[dateField];
    if (typeof value !== "string" || !value) return;

    const currentDate = parseISO(value);

    if (isNaN(currentDate.getTime())) return;

    if (isBefore(currentDate, earliest)) {
      earliest = currentDate;
    }

    if (isAfter(currentDate, latest)) {
      latest = currentDate;
    }
  });

  return {
    earliest: earliest.toISOString(),
    latest: latest.toISOString(),
  };
}

function extractLngLat(coordinate: unknown): [number, number] | null {
  if (Array.isArray(coordinate)) {
    const lon =
      typeof coordinate[0] === "string"
        ? parseFloat(coordinate[0])
        : coordinate[0];
    const lat =
      typeof coordinate[1] === "string"
        ? parseFloat(coordinate[1])
        : coordinate[1];

    if (typeof lon !== "number" || typeof lat !== "number" || isNaN(lon) || isNaN(lat)) {
      return null;
    }
    return [lon, lat];
  } else if (typeof coordinate === "object" && coordinate !== null) {
    if ("lng" in coordinate && "lat" in coordinate) {
      return [Number(coordinate.lng), Number(coordinate.lat)];
    } else if ("lon" in coordinate && "lat" in coordinate) {
      return [Number(coordinate.lon), Number(coordinate.lat)];
    }
  }
  return null;
}

export function findExtremeCoordinates(
  data: LngLatLike[][] | LngLatLike[]
): LngLatBoundsLike | null {
  if (!data || data.length === 0) {
    return null;
  }

  let minLng: number | null = null;
  let maxLng: number | null = null;
  let minLat: number | null = null;
  let maxLat: number | null = null;

  const normalizedData: LngLatLike[][] =
    data[0] && Array.isArray(data[0]) && Array.isArray(data[0][0])
      ? (data as LngLatLike[][])
      : [data as LngLatLike[]];

  normalizedData.forEach((ring) => {
    if (!ring || !Array.isArray(ring)) return;

    ring.forEach((coordinate) => {
      if (!coordinate) return;

      const extracted = extractLngLat(coordinate);
      if (!extracted) {
        console.warn("Invalid coordinate format:", coordinate);
        return;
      }

      const [lng, lat] = extracted;

      if (minLng === null || lng < minLng) minLng = lng;
      if (maxLng === null || lng > maxLng) maxLng = lng;
      if (minLat === null || lat < minLat) minLat = lat;
      if (maxLat === null || lat > maxLat) maxLat = lat;
    });
  });

  if (
    minLng === null ||
    maxLng === null ||
    minLat === null ||
    maxLat === null
  ) {
    console.warn("No valid coordinates found in data");
    return null;
  }

  return [minLng, minLat, maxLng, maxLat];
}

export function getGeoJsonPolygon(
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number
): Position[][] {
  if (minLat > maxLat || minLon > maxLon) {
    throw new Error(
      "Invalid bounding box. minLat must be <= maxLat and minLon must be <= maxLon."
    );
  }

  return [
    [
      [minLon, minLat],
      [minLon, maxLat],
      [maxLon, maxLat],
      [maxLon, minLat],
      [minLon, minLat],
    ],
  ];
}

export function generateFeatureCollectionByFoi(
  data: ComputerVisionObject[],
  foiLabel: string
): FeatureCollection {
  const features: Feature[] = data
    .filter((object) => object.label === foiLabel)
    .map((foi) => ({
      type: "Feature",
      properties: {
        pairId: foi.pairId,
        areaId: foi.areaPairId,
        areaCode: foi.areaCode,
      },
      geometry: {
        type: "Polygon",
        coordinates: getGeoJsonPolygon(
          foi.bbox.min_lat,
          foi.bbox.min_lon,
          foi.bbox.max_lat,
          foi.bbox.max_lon
        ),
      },
    }));

  return {
    type: "FeatureCollection",
    features,
  };
}

export function getUniqueYears(dates: Date[]): string[] {
  const years = dates.map((date) => getYear(date).toString());
  return Array.from(new Set(years)).sort((a, b) => parseInt(a) - parseInt(b));
}

export function calculateCentersUsingMinMaxXY(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): { centerLat: number; centerLng: number } {
  const centerLng = (minX + maxX) / 2;
  const centerLat = (minY + maxY) / 2;

  return { centerLng, centerLat };
}
