import { Feature, FeatureCollection, Position } from "geojson";

import { parseISO, isBefore, isAfter, getYear } from "date-fns";
import { LngLatBoundsLike, LngLatLike } from "maplibre-gl";
import { ComputerVisionObject } from "./types";

export type AnyObject = { [key: string]: any };

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

export function transformNullToEmptyString<T>(obj: T): T {
  const transformedObj = {} as T;

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      transformedObj[key] = value === null ? "" : value;
    }
  }

  return transformedObj;
}

export function calculateGlobalCenters(data): {
  global_x: number;
  global_y: number;
} {
  if (data.length === 0) {
    throw new Error("No available data to process.");
  }

  let sum_x = 0;
  let sum_y = 0;

  data.forEach((obj) => {
    const center_x = (parseFloat(obj.min_x) + parseFloat(obj.max_x)) / 2;
    const center_y = (parseFloat(obj.min_y) + parseFloat(obj.max_y)) / 2;

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

export function getEarliestandLatestDates(data, dateField) {
  // FIXED: Check if data exists AND is an array before checking length
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { earliest: null, latest: null };
  }

  // ADD: Check if first item has the date field
  if (!data[0]?.[dateField]) {
    return { earliest: null, latest: null };
  }

  let earliest = parseISO(data[0][dateField]);
  let latest = parseISO(data[0][dateField]);

  data.forEach((item) => {
    // ADD: Skip items without the date field
    if (!item?.[dateField]) return;

    const currentDate = parseISO(item[dateField]);

    // ADD: Skip invalid dates
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

// export function findExtremeCoordinates(data: LngLatLike[][]): LngLatBoundsLike {
//   let north: LngLatLike | null = null;
//   let south: LngLatLike | null = null;
//   let east: LngLatLike | null = null;
//   let west: LngLatLike | null = null;

//   data.forEach((ring) => {
//     ring.forEach((coordinate) => {
//       let lon: number;
//       let lat: number;

//       if (Array.isArray(coordinate)) {
//         [lon, lat] = coordinate;
//       } else if ("lng" in coordinate) {
//         lon = coordinate.lng;
//         lat = coordinate.lat;
//       } else if ("lon" in coordinate) {
//         lon = coordinate.lon;
//         lat = coordinate.lat;
//       } else {
//         throw new Error("Invalid coordinate format.");
//       }

//       if (
//         !north ||
//         lat >
//           (Array.isArray(north)
//             ? north[1]
//             : "lat" in north
//             ? north.lat
//             : north.lat)
//       ) {
//         north = [lon, lat];
//       }

//       if (
//         !south ||
//         lat <
//           (Array.isArray(south)
//             ? south[1]
//             : "lat" in south
//             ? south.lat
//             : south.lat)
//       ) {
//         south = [lon, lat];
//       }

//       if (
//         !east ||
//         lon >
//           (Array.isArray(east) ? east[0] : "lng" in east ? east.lng : east.lon)
//       ) {
//         east = [lon, lat];
//       }

//       if (
//         !west ||
//         lon <
//           (Array.isArray(west) ? west[0] : "lng" in west ? west.lng : west.lon)
//       ) {
//         west = [lon, lat];
//       }
//     });
//   });

//   if (!north || !south || !east || !west) {
//     throw new Error("No valid coordinates provided.");
//   }

//   return [
//     Array.isArray(west) ? west[0] : "lng" in west ? west.lng : west.lon,
//     Array.isArray(south) ? south[1] : "lat" in south ? south.lat : south.lat,
//     Array.isArray(east) ? east[0] : "lng" in east ? east.lng : east.lon,
//     Array.isArray(north) ? north[1] : "lat" in north ? north.lat : north.lat,
//   ];
// }

export function findExtremeCoordinates(
  data: LngLatLike[][] | LngLatLike[]
): LngLatBoundsLike | null {
  // ADD: Check if data is null/undefined/empty
  if (!data || data.length === 0) {
    return null;
  }

  let north: LngLatLike | null = null;
  let south: LngLatLike | null = null;
  let east: LngLatLike | null = null;
  let west: LngLatLike | null = null;

  // FIXED: Add null checks before accessing data[0]
  const normalizedData: LngLatLike[][] =
    data[0] && Array.isArray(data[0]) && Array.isArray(data[0][0])
      ? (data as LngLatLike[][])
      : [data as LngLatLike[]];

  normalizedData.forEach((ring) => {
    // ADD: Skip null/undefined rings
    if (!ring || !Array.isArray(ring)) return;

    ring.forEach((coordinate) => {
      // ADD: Skip null/undefined coordinates
      if (!coordinate) return;

      let lon: number;
      let lat: number;

      if (Array.isArray(coordinate)) {
        // Check if the elements are strings, and parse them as numbers if necessary
        lon =
          typeof coordinate[0] === "string"
            ? parseFloat(coordinate[0])
            : coordinate[0];
        lat =
          typeof coordinate[1] === "string"
            ? parseFloat(coordinate[1])
            : coordinate[1];
      } else if (typeof coordinate === "object" && "lng" in coordinate) {
        // Handle coordinates as objects with lng/lat keys
        lon = coordinate.lng;
        lat = coordinate.lat;
      } else if (typeof coordinate === "object" && "lon" in coordinate) {
        // Handle coordinates as objects with lon/lat keys
        lon = coordinate.lon;
        lat = coordinate.lat;
      } else {
        console.warn("Invalid coordinate format:", coordinate);
        return; // Skip invalid coordinates instead of throwing
      }

      // ADD: Check for valid numbers (not NaN)
      if (isNaN(lon) || isNaN(lat)) {
        console.warn("Invalid coordinate values:", { lon, lat });
        return;
      }

      if (
        !north ||
        lat >
          (Array.isArray(north)
            ? north[1]
            : "lat" in north
            ? north.lat
            : north.lat)
      ) {
        north = [lon, lat];
      }

      if (
        !south ||
        lat <
          (Array.isArray(south)
            ? south[1]
            : "lat" in south
            ? south.lat
            : south.lat)
      ) {
        south = [lon, lat];
      }

      if (
        !east ||
        lon >
          (Array.isArray(east) ? east[0] : "lng" in east ? east.lng : east.lon)
      ) {
        east = [lon, lat];
      }

      if (
        !west ||
        lon <
          (Array.isArray(west) ? west[0] : "lng" in west ? west.lng : west.lon)
      ) {
        west = [lon, lat];
      }
    });
  });

  // CHANGED: Return null instead of throwing error
  if (!north || !south || !east || !west) {
    console.warn("No valid coordinates found in data");
    return null;
  }

  return [
    Array.isArray(west) ? west[0] : "lng" in west ? west.lng : west.lon,
    Array.isArray(south) ? south[1] : "lat" in south ? south.lat : south.lat,
    Array.isArray(east) ? east[0] : "lng" in east ? east.lng : east.lon,
    Array.isArray(north) ? north[1] : "lat" in north ? north.lat : north.lat,
  ];
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
      [minLon, minLat], // Bottom-left corner
      [minLon, maxLat], // Top-left corner
      [maxLon, maxLat], // Top-right corner
      [maxLon, minLat], // Bottom-right corner
      [minLon, minLat], // Closing the polygon (back to bottom-left corner)]];
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
        areaId: foi.areaId,
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
