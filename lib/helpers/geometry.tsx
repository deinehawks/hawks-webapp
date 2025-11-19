import { Feature, FeatureCollection } from "geojson";
import { ComputerVisionObject, GeometryType } from "@/lib/types";

/**
 * Generates a FeatureCollection of either points or lines from ComputerVisionObjects,
 * depending on the geometryType parameter.
 *
 * - For GeometryType.Point: creates a point at the bounding box center.
 * - For GeometryType.LineString: creates lines from the center to halfway min/max lat/lon.
 */
export function generateFeatureCollection(
  geometryType: GeometryType,
  featureOfInterestLabel: string,
  data: ComputerVisionObject[]
): FeatureCollection {
  /**
   * Helper function to extract or calculate center coordinates from bounding box.
   *
   * Supports two data formats:
   * 1. Pre-calculated center: Uses cen_lon and cen_lat if available
   * 2. Bounding box format: Calculates center from min/max values (other datasets)
   *    - Center longitude = (min_lon + max_lon) / 2
   *    - Center latitude = (min_lat + max_lat) / 2
   *
   * @param bbox - Bounding box object with either (cen_lon, cen_lat) or (min_lon, max_lon, min_lat, max_lat)
   * @returns Object with lon and lat properties representing the center point
   */
  const getCenter = (bbox: any) => {
    // Check if pre-calculated center coordinates are provided
    if (bbox.cen_lon !== undefined && bbox.cen_lat !== undefined) {
      return { lon: bbox.cen_lon, lat: bbox.cen_lat };
    }

    // Calculate center from bounding box min/max values
    if (
      bbox.min_lon !== undefined &&
      bbox.max_lon !== undefined &&
      bbox.min_lat !== undefined &&
      bbox.max_lat !== undefined
    ) {
      return {
        lon: (bbox.min_lon + bbox.max_lon) / 2, // Midpoint between left and right edges
        lat: (bbox.min_lat + bbox.max_lat) / 2, // Midpoint between bottom and top edges
      };
    }

    // Fallback if neither format is available to prevent errors
    return { lon: 0, lat: 0 };
  };

  if (geometryType === GeometryType.Point) {
    const features: Feature[] = data
      .filter((object) => object.label === featureOfInterestLabel)
      .map((foi) => {
        const { lon: cen_lon, lat: cen_lat } = getCenter(foi.bbox);
        return {
          type: "Feature",
          properties: {
            pairId: foi.pairId,
            areaId: foi.areaPairId,
            areaCode: foi.areaCode,
          },
          geometry: {
            type: "Point",
            coordinates: [cen_lon, cen_lat],
          },
        };
      });

    return {
      type: "FeatureCollection",
      features,
    };
  }

  if (geometryType === GeometryType.LineString) {
    const features: Feature[] = data
      .filter((object) => object.label === featureOfInterestLabel)
      .flatMap((obj) => {
        const { min_lon, max_lon, min_lat, max_lat } = obj.bbox;
        const { lon: cen_lon, lat: cen_lat } = getCenter(obj.bbox);

        // Calculate halfway points between center and min/max for lat and lon
        const halfMinLat = (cen_lat + min_lat) / 2;
        const halfMaxLat = (cen_lat + max_lat) / 2;
        const halfMinLon = (cen_lon + min_lon) / 2;
        const halfMaxLon = (cen_lon + max_lon) / 2;

        // Vertical lines: center to halfway min_lat and center to halfway max_lat
        const verticalToMin: Feature = {
          type: "Feature",
          properties: { type: "vertical-min", pairId: obj.pairId },
          geometry: {
            type: "LineString",
            coordinates: [
              [cen_lon, cen_lat],
              [cen_lon, halfMinLat],
            ],
          },
        };

        const verticalToMax: Feature = {
          type: "Feature",
          properties: { type: "vertical-max", pairId: obj.pairId },
          geometry: {
            type: "LineString",
            coordinates: [
              [cen_lon, cen_lat],
              [cen_lon, halfMaxLat],
            ],
          },
        };

        // Horizontal lines: center to halfway min_lon and center to halfway max_lon
        const horizontalToMin: Feature = {
          type: "Feature",
          properties: { type: "horizontal-min", pairId: obj.pairId },
          geometry: {
            type: "LineString",
            coordinates: [
              [cen_lon, cen_lat],
              [halfMinLon, cen_lat],
            ],
          },
        };

        const horizontalToMax: Feature = {
          type: "Feature",
          properties: { type: "horizontal-max", pairId: obj.pairId },
          geometry: {
            type: "LineString",
            coordinates: [
              [cen_lon, cen_lat],
              [halfMaxLon, cen_lat],
            ],
          },
        };

        return [verticalToMin, verticalToMax, horizontalToMin, horizontalToMax];
      });

    return {
      type: "FeatureCollection",
      features,
    };
  }

  // Optionally, handle other geometry types or throw an error
  return {
    type: "FeatureCollection",
    features: [],
  };
}
