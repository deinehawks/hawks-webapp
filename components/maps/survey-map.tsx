"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateCentersUsingMinMaxXY,
  findExtremeCoordinates,
} from "@/lib/helpers";
import { type ComputerVisionObject } from "@/lib/types";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import {
  Layer,
  Map,
  MapMouseEvent,
  Popup,
  Source,
  useMap,
} from "@vis.gl/react-maplibre";
import { format, getYear } from "date-fns";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { ThreeDimensionalModelCard } from "@/components/3d-model-card";
import { ThreeDimensionalModelSelector } from "@/components/selectors/3d-model-selector";
import { FoiSelector } from "@/components/selectors/foi-selector";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ThreeDimensionalModelCaller from "@/components/callers/3d-caller";

// Constants
const PIN_IMAGES = {
  yellow: `<svg width="32" height="48" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path d="M16 2C8.27 2 2 8.27 2 16c0 8 14 28 14 28s14-20 14-28c0-7.73-6.27-14-14-14z" fill="#fbc02d" stroke="#fff" stroke-width="2" filter="url(#shadow)"/>
    <circle cx="16" cy="16" r="5" fill="#fff"/>
  </svg>`,
  red: `<svg width="32" height="48" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
      </filter>
    </defs>
    <path d="M16 2C8.27 2 2 8.27 2 16c0 8 14 28 14 28s14-20 14-28c0-7.73-6.27-14-14-14z" fill="#ff0000" stroke="#fff" stroke-width="2" filter="url(#shadow)"/>
    <circle cx="16" cy="16" r="5" fill="#fff"/>
  </svg>`,
};

const DEFAULT_CENTER = {
  lng: 125.58147596772221,
  lat: 7.0763840759644,
  zoom: 12,
};

const ZOOM_DEFAULTS = {
  heatmapMaxZoom: 15,
  pinMinZoom: 15,
};

const MAP_CONFIG = {
  minZoom: 13,
  maxZoom: 23,
  tileSize: 256,
  orthoMinZoom: 15,
  orthoMaxZoom: 24,
};

// Utility functions
const isValidNumber = (value: any): boolean => {
  return value != null && !isNaN(value) && isFinite(value);
};

const isValidCoordinate = (lng: number, lat: number): boolean => {
  return isValidNumber(lng) && isValidNumber(lat);
};

const hasValidMinMaxCoordinates = (survey: any): boolean => {
  // Check original database coordinates
  const hasOriginalCoords = [
    survey.min_x,
    survey.max_x,
    survey.min_y,
    survey.max_y,
  ].every(isValidNumber);

  // Check tile bounds coordinates
  const hasTileBounds = [
    survey.tile_min_x,
    survey.tile_max_x,
    survey.tile_min_y,
    survey.tile_max_y,
  ].every(isValidNumber);

  return hasOriginalCoords || hasTileBounds;
};

const hasValidBoundaries = (boundaries: any[]): boolean => {
  if (!Array.isArray(boundaries) || boundaries.length === 0) return false;

  return boundaries.some((coord) => {
    if (!Array.isArray(coord) || coord.length < 2) return false;
    const [lng, lat] = coord;
    return isValidCoordinate(lng, lat);
  });
};

const hasOrthoTilesAvailable = (survey: any): boolean => {
  return Boolean(
    survey.ortho !== null && survey.code && survey.id && survey.flight_date
  );
};

const calculateOptimalZoomLevels = (features: any[]) => {
  if (!features?.length) return ZOOM_DEFAULTS;

  const coords = features
    .filter((f) => f.geometry?.coordinates)
    .map((f) => f.geometry.coordinates);

  if (!coords.length) return ZOOM_DEFAULTS;

  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);

  const lonSpan = Math.max(...lons) - Math.min(...lons);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const avgSpan = (lonSpan + latSpan) / 2;

  let zoomThreshold = 15;

  if (avgSpan > 0.1) zoomThreshold = 17;
  else if (avgSpan > 0.01) zoomThreshold = 16;
  else zoomThreshold = 19;

  const density = features.length / (avgSpan * avgSpan || 1);

  if (density > 1000) zoomThreshold = Math.min(19, zoomThreshold + 1);
  else if (density < 10) zoomThreshold = Math.max(13, zoomThreshold - 2);

  return {
    heatmapMaxZoom: zoomThreshold,
    pinMinZoom: zoomThreshold,
  };
};

const calculateCentersWithOffset = (
  min_lon: number,
  max_lon: number,
  min_lat: number,
  max_lat: number
) => {
  return {
    centerLng: (min_lon + max_lon) / 2,
    centerLat: (min_lat + max_lat) / 2,
  };
};

const generatePointsWithOffset = (
  detectedObjects: ComputerVisionObject[],
  label: string
) => {
  if (!Array.isArray(detectedObjects)) {
    return { type: "FeatureCollection", features: [] };
  }

  const features = detectedObjects
    .filter((obj) => obj.label === label)
    .map((obj) => {
      const { centerLng, centerLat } = calculateCentersWithOffset(
        obj.bbox.min_lon,
        obj.bbox.max_lon,
        obj.bbox.min_lat,
        obj.bbox.max_lat
      );

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [centerLng, centerLat],
        },
        properties: {
          pairId: obj.pairId,
          areaPairId: obj.areaPairId,
          label: obj.label,
        },
      };
    });

  return { type: "FeatureCollection", features };
};

function calculateCentroid(coordinates: number[][]) {
  let sumX = 0;
  let sumY = 0;
  const points = coordinates;

  for (let i = 0; i < points.length; i++) {
    sumX += points[i][0];
    sumY += points[i][1];
  }

  return [sumX / points.length, sumY / points.length];
}

function tileToBounds(
  x: number,
  y: number,
  z: number
): [number, number, number, number] {
  const n = Math.pow(2, z);
  const lonMin = (x / n) * 360 - 180;
  const lonMax = ((x + 1) / n) * 360 - 180;
  const latMin =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
  const latMax =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return [lonMin, latMin, lonMax, latMax];
}

// Hooks
const useMapCenter = (survey: any, fallbackCenter: typeof DEFAULT_CENTER) => {
  return useMemo(() => {
    // Try min/max coordinates
    if (hasValidMinMaxCoordinates(survey)) {
      try {
        const { centerLng, centerLat } = calculateCentersUsingMinMaxXY(
          survey.min_x,
          survey.max_x,
          survey.min_y,
          survey.max_y
        );

        if (isValidCoordinate(centerLng, centerLat)) {
          return { lng: centerLng, lat: centerLat, zoom: 17 };
        }
      } catch (error) {
        console.error("Error calculating center from min/max:", error);
      }
    }

    // Try geojson boundaries
    if (hasValidBoundaries(survey.geojson_boundaries)) {
      try {
        const extremes = findExtremeCoordinates(survey.geojson_boundaries);
        if (extremes) {
          const centerLng = (extremes.minLng + extremes.maxLng) / 2;
          const centerLat = (extremes.minLat + extremes.maxLat) / 2;

          if (isValidCoordinate(centerLng, centerLat)) {
            return { lng: centerLng, lat: centerLat, zoom: 17 };
          }
        }
      } catch (error) {
        console.error("Error calculating center from boundaries:", error);
      }
    }

    // If we have ortho tiles but no coordinate data, use fallback with appropriate zoom
    // The auto-zoom logic will adjust to tiles once they load
    if (hasOrthoTilesAvailable(survey)) {
      return { ...fallbackCenter, zoom: MAP_CONFIG.orthoMinZoom };
    }

    return { ...fallbackCenter, zoom: fallbackCenter.zoom || 12 };
  }, [survey, fallbackCenter]);
};

const useMapBounds = (survey: any) => {
  return useMemo(() => {
    if (!hasValidBoundaries(survey.geojson_boundaries)) return null;

    try {
      const extremes = findExtremeCoordinates(survey.geojson_boundaries);
      if (!extremes) return null;

      const { minLng, minLat, maxLng, maxLat } = extremes;

      if (
        !isValidCoordinate(minLng, minLat) ||
        !isValidCoordinate(maxLng, maxLat)
      ) {
        return null;
      }

      return [
        [minLng, minLat],
        [maxLng, maxLat],
      ];
    } catch (error) {
      console.error("Error calculating bounds:", error);
      return null;
    }
  }, [survey.geojson_boundaries]);
};

const useValidationState = (survey: any) => {
  return useMemo(() => {
    const hasValidCoordinates =
      hasValidMinMaxCoordinates(survey) ||
      hasValidBoundaries(survey.geojson_boundaries);

    const hasOrthoTiles = hasOrthoTilesAvailable(survey);
    const shouldShowMap = hasOrthoTiles || hasValidCoordinates;

    return { hasValidCoordinates, hasOrthoTiles, shouldShowMap };
  }, [survey]);
};

// Sub-components
function SurveyMapEvents({
  survey,
  detectedObjects,
}: {
  survey: any;
  detectedObjects: ComputerVisionObject[];
}) {
  const { current: map } = useMap();
  const { setPopupInfo, setHoveredPairId } = useSurveyMapStore(
    (state) => state
  );

  const handleBboxClick = useCallback(
    (e: MapMouseEvent) => {
      const objectPairId = e.features?.[0]?.properties?.pairId;
      if (!objectPairId) return;

      const clickedObject = detectedObjects.find(
        (object) => object.pairId === objectPairId
      );
      if (!clickedObject) return;

      const { pairId, areaPairId: areaId, bbox } = clickedObject;
      const { centerLng, centerLat } = calculateCentersWithOffset(
        bbox.min_lon,
        bbox.max_lon,
        bbox.min_lat,
        bbox.max_lat
      );

      setPopupInfo({ pairId, areaId, centerLng, centerLat });
    },
    [detectedObjects, setPopupInfo]
  );

  const handlePinHover = useCallback(
    (e: MapMouseEvent) => {
      const pairId = e.features?.[0]?.properties?.pairId;
      setHoveredPairId(pairId || null);

      if (pairId && map) {
        map.getCanvas().style.cursor = "pointer";
      }
    },
    [map, setHoveredPairId]
  );

  const handlePinLeave = useCallback(() => {
    setHoveredPairId(null);
    if (map) {
      map.getCanvas().style.cursor = "";
    }
  }, [map, setHoveredPairId]);

  useEffect(() => {
    if (!map || !survey?.id) return;

    const LAYER_TYPES = {
      CLICK: [
        "unhealthy-fill",
        "unhealthy-pin",
        "healthy-pin",
        "unhealthy-circle",
        "healthy-circle",
      ],
      HOVER: [
        "unhealthy-pin",
        "healthy-pin",
        "unhealthy-circle",
        "healthy-circle",
      ],
    };

    const clickLayers = LAYER_TYPES.CLICK.map((id) => `${survey.id}-${id}`);
    const hoverLayers = LAYER_TYPES.HOVER.map((id) => `${survey.id}-${id}`);

    // Register event listeners
    clickLayers.forEach((layer) => map.on("click", layer, handleBboxClick));
    hoverLayers.forEach((layer) => {
      map.on("mouseenter", layer, handlePinHover);
      map.on("mouseleave", layer, handlePinLeave);
    });

    // Cleanup
    return () => {
      clickLayers.forEach((layer) => map.off("click", layer, handleBboxClick));
      hoverLayers.forEach((layer) => {
        map.off("mouseenter", layer, handlePinHover);
        map.off("mousele", layer, handlePinLeave);
      });
    };
  }, [map, survey, handleBboxClick, handlePinHover, handlePinLeave]);

  return null;
}

function InitializeMapImages() {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map) return;

    const loadSvgImage = (svgString: string, id: string) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
          if (!map.hasImage(id)) {
            map.addImage(id, imageData);
          }
        } catch (error) {
          console.warn(`Failed to add image ${id}:`, error);
        }
      };
      img.onerror = () => console.error(`Failed to load SVG image for ${id}`);
      img.src = `data:image/svg+xml;base64,${btoa(svgString)}`;
    };

    loadSvgImage(PIN_IMAGES.yellow, "pin-yellow");
    loadSvgImage(PIN_IMAGES.red, "pin-red");
  }, [map]);

  return null;
}

function MapLegend() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="absolute bottom-8 left-8 z-10 flex items-end gap-2">
      <div
        className={`bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 translate-x-0 w-80"
            : "opacity-0 -translate-x-4 w-0 pointer-events-none"
        }`}
      >
        <div className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            Map Legend
          </h3>

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 group">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full border-2 border-black shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  Healthy Plants
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Yellow pins • No signs of disease
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 group">
              <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-2 border-black shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  Infected Plants
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Red pins • Disease or pest detected
                </div>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                Heatmap View
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5 rounded overflow-hidden shadow-sm">
                    {[
                      "bg-yellow-200",
                      "bg-yellow-300",
                      "bg-yellow-400",
                      "bg-yellow-500",
                      "bg-yellow-600",
                    ].map((color, i) => (
                      <div key={i} className={`w-6 h-6 ${color}`} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-600 flex-1">
                    Plant Density
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg
                className="w-3.5 h-3.5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Hover or click plants to see detection area</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex-shrink-0 p-3 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 hover:shadow-xl hover:border-gray-300 transition-all duration-200 group"
        title={isOpen ? "Hide legend" : "Show legend"}
        aria-label={isOpen ? "Hide legend" : "Show legend"}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5 text-gray-700 transition-transform duration-200 group-hover:-translate-x-0.5" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-700 transition-transform duration-200 group-hover:translate-x-0.5" />
        )}
      </button>
    </div>
  );
}

function FeaturesOfInterest({
  detectedObjects,
  survey,
}: {
  detectedObjects: ComputerVisionObject[];
  survey: any;
}) {
  const { selectedFoi, popupInfo, hoveredPairId } = useSurveyMapStore(
    (state) => state
  );
  const id = survey?.id;

  const healthyBananas = useMemo(
    () =>
      generatePointsWithOffset(
        detectedObjects,
        "Banana Plant (Healthy-looking)"
      ),
    [detectedObjects]
  );

  const unhealthyBananas = useMemo(
    () => generatePointsWithOffset(detectedObjects, "Banana Plant (Infected)"),
    [detectedObjects]
  );

  const selectedPlantBbox = useMemo(() => {
    const selectedId = popupInfo?.pairId || hoveredPairId;
    if (!selectedId) return null;

    const selectedObject = detectedObjects.find(
      (obj) => obj.pairId === selectedId
    );
    if (!selectedObject) return null;

    const { min_lon, max_lon, min_lat, max_lat } = selectedObject.bbox;

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [min_lon, min_lat],
                [max_lon, min_lat],
                [max_lon, max_lat],
                [min_lon, max_lat],
                [min_lon, min_lat],
              ],
            ],
          },
          properties: {
            pairId: selectedObject.pairId,
            label: selectedObject.label,
          },
        },
      ],
    };
  }, [detectedObjects, popupInfo, hoveredPairId]);

  const healthyZoomLevels = useMemo(() => {
    const levels = calculateOptimalZoomLevels(
      (healthyBananas as any).features || []
    );
    return {
      heatmapMaxZoom: levels.heatmapMaxZoom,
      pinMinZoom: Math.max(13, levels.pinMinZoom - 1.5),
    };
  }, [healthyBananas]);

  const unhealthyZoomLevels = useMemo(() => {
    const levels = calculateOptimalZoomLevels(
      (unhealthyBananas as any).features || []
    );
    return {
      heatmapMaxZoom: levels.heatmapMaxZoom,
      pinMinZoom: Math.max(13, levels.pinMinZoom - 1.5),
    };
  }, [unhealthyBananas]);

  const isHealthy =
    selectedPlantBbox?.features[0]?.properties?.label?.includes("Healthy");
  const showHealthy = selectedFoi === "healthy" || selectedFoi === "all";
  const showUnhealthy = selectedFoi === "unhealthy" || selectedFoi === "all";

  if (!id) return null;

  return (
    <>
      {selectedPlantBbox && (
        <Source
          id={`${id}-selected-bbox`}
          type="geojson"
          data={selectedPlantBbox}
        >
          <Layer
            id={`${id}-selected-bbox-fill`}
            type="fill"
            paint={{
              "fill-color": isHealthy ? "#fbbf24" : "#ff0000",
              "fill-opacity": 0.15,
            }}
          />
          <Layer
            id={`${id}-selected-bbox-outline`}
            type="line"
            paint={{
              "line-color": isHealthy ? "#fbbf24" : "#ff0000",
              "line-width": 2,
              "line-opacity": 0.8,
              "line-dasharray": [2, 2],
            }}
          />
        </Source>
      )}

      {showHealthy && (
        <>
          <Source id={`${id}-healthy`} type="geojson" data={healthyBananas}>
            <Layer
              id={`${id}-healthy-heatmap`}
              type="heatmap"
              maxzoom={healthyZoomLevels.heatmapMaxZoom}
              paint={{
                "heatmap-weight": [
                  "interpolate",
                  ["linear"],
                  ["get", "mag"],
                  0,
                  0,
                  6,
                  1,
                ],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(251, 192, 45, 0)",
                  0.2,
                  "rgba(251, 192, 45, 0.3)",
                  0.5,
                  "rgba(251, 192, 45, 0.6)",
                  1,
                  "rgba(251, 192, 45, 0.9)",
                ],
                "heatmap-radius": [
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
                ],
                "heatmap-opacity": 0.7,
              }}
            />
          </Source>

          <Source
            id={`${id}-healthy-circles`}
            type="geojson"
            data={healthyBananas}
          >
            <Layer
              id={`${id}-healthy-circle`}
              type="circle"
              minzoom={13}
              maxzoom={healthyZoomLevels.pinMinZoom}
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13,
                  6,
                  14,
                  8,
                  15,
                  10,
                  16,
                  12,
                ],
                "circle-color": "#fbbf24",
                "circle-opacity": 0.4,
                "circle-stroke-color": "#fbbf24",
                "circle-stroke-width": 2,
                "circle-stroke-opacity": 0.8,
              }}
            />
          </Source>

          <Source
            id={`${id}-healthy-pins`}
            type="geojson"
            data={healthyBananas}
          >
            <Layer
              id={`${id}-healthy-pin`}
              type="symbol"
              minzoom={healthyZoomLevels.pinMinZoom}
              layout={{
                "icon-image": "pin-yellow",
                "icon-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13,
                  0.1,
                  14,
                  0.2,
                  15,
                  0.2,
                  16,
                  0.3,
                  17,
                  0.3,
                  18,
                  0.4,
                  20,
                  0.5,
                ],
                "icon-allow-overlap": true,
              }}
              paint={{ "icon-opacity": 0.75 }}
            />
          </Source>
        </>
      )}

      {showUnhealthy && (
        <>
          <Source id={`${id}-unhealthy`} type="geojson" data={unhealthyBananas}>
            <Layer
              id={`${id}-unhealthy-heatmap`}
              type="heatmap"
              maxzoom={unhealthyZoomLevels.heatmapMaxZoom}
              paint={{
                "heatmap-weight": [
                  "interpolate",
                  ["linear"],
                  ["get", "mag"],
                  0,
                  0,
                  6,
                  1,
                ],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(255, 0, 0, 0)",
                  0.2,
                  "rgba(255, 0, 0, 0.3)",
                  0.5,
                  "rgba(255, 0, 0, 0.6)",
                  1,
                  "rgba(150, 0, 0, 0.9)",
                ],
                "heatmap-radius": [
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
                ],
                "heatmap-opacity": 0.7,
              }}
            />
          </Source>

          <Source
            id={`${id}-unhealthy-circles`}
            type="geojson"
            data={unhealthyBananas}
          >
            <Layer
              id={`${id}-unhealthy-circle`}
              type="circle"
              minzoom={13}
              maxzoom={unhealthyZoomLevels.pinMinZoom}
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13,
                  6,
                  14,
                  8,
                  15,
                  10,
                  16,
                  12,
                ],
                "circle-color": "#ff0000",
                "circle-opacity": 0.4,
                "circle-stroke-color": "#ff0000",
                "circle-stroke-width": 2,
                "circle-stroke-opacity": 0.8,
              }}
            />
          </Source>

          <Source
            id={`${id}-unhealthy-pins`}
            type="geojson"
            data={unhealthyBananas}
          >
            <Layer
              id={`${id}-unhealthy-pin`}
              type="symbol"
              minzoom={unhealthyZoomLevels.pinMinZoom}
              layout={{
                "icon-image": "pin-red",
                "icon-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13,
                  0.1,
                  14,
                  0.2,
                  15,
                  0.2,
                  16,
                  0.3,
                  17,
                  0.4,
                  18,
                  0.5,
                  20,
                  0.6,
                ],
                "icon-allow-overlap": true,
              }}
              paint={{ "icon-opacity": 0.75 }}
            />
          </Source>
        </>
      )}
    </>
  );
}

function ObjectPopup() {
  const { popupInfo, setPopupInfo } = useSurveyMapStore((state) => state);

  if (!popupInfo) return null;

  const { pairId, areaId, centerLng, centerLat } = popupInfo;

  return (
    <Popup
      anchor="bottom"
      longitude={centerLng}
      latitude={centerLat}
      onClose={() => setPopupInfo(null)}
      closeOnClick={false}
    >
      <div className="flex flex-col w-fit gap-1">
        <div className="font-semibold">Object Information</div>
        <Separator />
        <div className="flex flex-col">
          <div className="grid grid-cols-2 gap-2">
            <span>Longitude:</span>
            <span className="text-muted-foreground">
              {centerLng.toFixed(6)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span>Latitude:</span>
            <span className="text-muted-foreground">
              {centerLat.toFixed(6)}
            </span>
          </div>
        </div>
      </div>
    </Popup>
  );
}

function NoMapDataFallback() {
  return (
    <div className="flex h-96 lg:h-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-2 border-slate-200">
      <div className="text-center p-8 max-w-md">
        <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-200">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        </div>
        <h3 className="font-semibold text-lg mb-2 text-slate-900">
          No Map Data Available
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          This survey does not have orthomosaic tiles or coordinate data to
          display on the map.
        </p>
      </div>
    </div>
  );
}

function RegionalViewOverlay() {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
        <svg
          className="w-4 h-4 text-blue-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          <span className="font-semibold">Regional View:</span> Zoom in to see
          orthomosaic imagery
        </span>
      </div>
    </div>
  );
}

function SurveyBoundaries({ survey }: { survey: any }) {
  if (!survey.geojson_boundaries || !Array.isArray(survey.geojson_boundaries)) {
    return null;
  }

  // Create polygon feature
  const coordinates = [
    survey.geojson_boundaries.map((pair: string[]) => [
      parseFloat(pair[0]),
      parseFloat(pair[1]),
    ]),
  ];

  const polygonFeature = {
    type: "Feature",
    properties: {
      survey_id: survey.id,
    },
    geometry: {
      type: "Polygon",
      coordinates: coordinates,
    },
  };

  // Create label feature at centroid
  const centroid = calculateCentroid(coordinates[0]);
  const labelFeature = {
    type: "Feature",
    properties: {
      survey_id: survey.id,
      label: `${survey.access_code}-${survey.area_code}`,
    },
    geometry: {
      type: "Point",
      coordinates: centroid,
    },
  };

  return (
    <>
      {/* Polygon boundaries */}
      <Source
        id="survey-boundary"
        type="geojson"
        data={{
          type: "FeatureCollection",
          features: [polygonFeature],
        }}
        generateId={true}
      >
        {/* Fill layer */}
        <Layer
          id="boundary-fill"
          type="fill"
          paint={{
            "fill-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              "#0ea5e9",
              "#06b6d4",
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.7,
              0.4,
            ],
          }}
        />

        {/* Border layer */}
        <Layer
          id="boundary-border"
          type="line"
          paint={{
            "line-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              "#0284c7",
              "#0891b2",
            ],
            "line-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              3,
              1.5,
            ],
            "line-blur": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.5,
              0,
            ],
          }}
        />

        {/* Glow layer */}
        <Layer
          id="boundary-glow"
          type="line"
          paint={{
            "line-color": "#0ea5e9",
            "line-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              6,
              0,
            ],
            "line-blur": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              4,
              0,
            ],
            "line-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.6,
              0,
            ],
          }}
        />
      </Source>

      {/* Label */}
      <Source
        id="survey-boundary-label"
        type="geojson"
        data={{
          type: "FeatureCollection",
          features: [labelFeature],
        }}
      >
        <Layer
          id="boundary-label"
          type="symbol"
          layout={{
            "text-field": ["get", "label"],
            "text-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              10,
              16,
              14,
              20,
              18,
            ],
            "text-anchor": "center",
          }}
          paint={{
            "text-color": "#ffffff",
            "text-halo-color": "#0891b2",
            "text-halo-width": 2,
            "text-halo-blur": 1,
          }}
        />
      </Source>
    </>
  );
}

function SurveyBoundaryEvents({ survey }: { survey: any }) {
  const { current: map } = useMap();
  const hoveredFeatureIdRef = useRef<number | null>(null);

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!map || !e.features?.length) return;

      map.getCanvas().style.cursor = "pointer";

      if (hoveredFeatureIdRef.current !== null) {
        map.setFeatureState(
          { source: "survey-boundary", id: hoveredFeatureIdRef.current },
          { hover: false }
        );
      }
      hoveredFeatureIdRef.current = e.features[0].id;
      map.setFeatureState(
        { source: "survey-boundary", id: hoveredFeatureIdRef.current },
        { hover: true }
      );
    },
    [map]
  );

  const handleMouseLeave = useCallback(() => {
    if (!map) return;
    map.getCanvas().style.cursor = "";
    if (hoveredFeatureIdRef.current !== null) {
      map.setFeatureState(
        { source: "survey-boundary", id: hoveredFeatureIdRef.current },
        { hover: false }
      );
      hoveredFeatureIdRef.current = null;
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    map.on("mousemove", "boundary-fill", handleMouseMove);
    map.on("mouseleave", "boundary-fill", handleMouseLeave);

    return () => {
      map.off("mousemove", "boundary-fill", handleMouseMove);
      map.off("mouseleave", "boundary-fill", handleMouseLeave);
    };
  }, [map, handleMouseMove, handleMouseLeave]);

  return null;
}

function MapView({
  survey,
  mapCenter,
  mapBounds,
  detectedObjects,
  hasValidCoordinates,
  hasOrthoTiles,
}: any) {
  const { current: map } = useMap();
  const [hasZoomed, setHasZoomed] = useState(false);
  const loadedTilesRef = useRef<Set<string>>(new Set());
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use MapLibre's tile events to detect when tiles are loaded
  useEffect(() => {
    if (!map || !hasOrthoTiles || hasValidCoordinates || hasZoomed) {
      return;
    }

    const handleSourceData = (e: any) => {
      // Only process ortho source tiles
      if (e.sourceId !== "ortho") return;
      if (!e.isSourceLoaded) return;
      if (e.tile) {
        // Track this tile
        const tileKey = `${e.tile.tileID.canonical.z}/${e.tile.tileID.canonical.x}/${e.tile.tileID.canonical.y}`;
        loadedTilesRef.current.add(tileKey);

        console.log(
          `Tile loaded: ${tileKey}, total tiles: ${loadedTilesRef.current.size}`
        );
      }

      // Debounce: wait for tiles to stop loading
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }

      zoomTimeoutRef.current = setTimeout(() => {
        if (loadedTilesRef.current.size > 0 && !hasZoomed) {
          performAutoZoom();
        }
      }, 1000); // Wait 1 second after last tile loads
    };

    const performAutoZoom = () => {
      if (hasZoomed || loadedTilesRef.current.size === 0) return;

      console.log(
        `Calculating bounds from ${loadedTilesRef.current.size} tiles`
      );

      let minLng = Infinity,
        maxLng = -Infinity;
      let minLat = Infinity,
        maxLat = -Infinity;

      // Parse tile coordinates and calculate bounds
      loadedTilesRef.current.forEach((tileKey) => {
        const [z, x, y] = tileKey.split("/").map(Number);
        const bounds = tileToBounds(x, y, z);

        minLng = Math.min(minLng, bounds[0]);
        minLat = Math.min(minLat, bounds[1]);
        maxLng = Math.max(maxLng, bounds[2]);
        maxLat = Math.max(maxLat, bounds[3]);
      });

      // Validate bounds
      if (
        !isFinite(minLng) ||
        !isFinite(maxLng) ||
        !isFinite(minLat) ||
        !isFinite(maxLat)
      ) {
        console.warn("Invalid bounds calculated from tiles");
        return;
      }

      // Add padding (10% buffer)
      const lngBuffer = (maxLng - minLng) * 0.1;
      const latBuffer = (maxLat - minLat) * 0.1;

      console.log("Auto-zooming to raster tiles:", {
        bounds: [
          [minLng - lngBuffer, minLat - latBuffer],
          [maxLng + lngBuffer, maxLat + latBuffer],
        ],
        tilesFound: loadedTilesRef.current.size,
      });

      // Fit the map to the calculated bounds
      try {
        map.fitBounds(
          [
            [minLng - lngBuffer, minLat - latBuffer],
            [maxLng + lngBuffer, maxLat + latBuffer],
          ],
          {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            duration: 1500,
            maxZoom: 19,
          }
        );
        setHasZoomed(true);
      } catch (error) {
        console.error("Error fitting bounds:", error);
      }
    };

    // Listen for tile loading events
    map.on("sourcedata", handleSourceData);

    // Cleanup
    return () => {
      map.off("sourcedata", handleSourceData);
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, [map, hasOrthoTiles, hasValidCoordinates, hasZoomed, survey.id]);

  // Reset state when survey changes
  useEffect(() => {
    setHasZoomed(false);
    loadedTilesRef.current.clear();
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
      zoomTimeoutRef.current = null;
    }
  }, [survey.id]);

  return (
    <Map
      id="survey-map"
      initialViewState={{
        longitude: mapCenter.lng,
        latitude: mapCenter.lat,
        zoom: hasValidCoordinates
          ? mapBounds
            ? undefined
            : mapCenter.zoom
          : mapCenter.zoom, // Use the zoom from mapCenter (which is now orthoMinZoom for tiles-only case)
        bounds: hasValidCoordinates && mapBounds ? mapBounds : undefined,
        fitBoundsOptions:
          hasValidCoordinates && mapBounds ? { padding: 50 } : undefined,
      }}
      minZoom={MAP_CONFIG.minZoom}
      maxZoom={MAP_CONFIG.maxZoom}
      mapStyle={{
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"],
            tileSize: MAP_CONFIG.tileSize,
            attribution: "&copy; OpenStreetMap Contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      }}
      doubleClickZoom={false}
    >
      <InitializeMapImages />
      <SurveyMapEvents survey={survey} detectedObjects={detectedObjects} />

      {/* Show boundaries ONLY when there's NO orthomosaic data */}
      {!hasOrthoTiles && hasValidCoordinates && (
        <>
          <SurveyBoundaries survey={survey} />
          <SurveyBoundaryEvents survey={survey} />
        </>
      )}
      {hasOrthoTiles && (
        <>
          <Source
            id="ortho"
            type="raster"
            tiles={[
              `/asimov-hawks/tiles/${survey.code.toLowerCase()}/${getYear(
                new Date(survey.flight_date)
              )}/${survey.id}/ortho/sharp-corners/{z}/{x}/{y}.png`,
            ]}
            tileSize={MAP_CONFIG.tileSize}
            scheme="tms"
            minzoom={MAP_CONFIG.orthoMinZoom}
            maxzoom={MAP_CONFIG.orthoMaxZoom}
          >
            <Layer
              id="ortho"
              type="raster"
              minzoom={MAP_CONFIG.orthoMinZoom}
              maxzoom={MAP_CONFIG.orthoMaxZoom}
              paint={{ "raster-opacity": 1 }}
            />
          </Source>

          {detectedObjects.length > 0 && (
            <FeaturesOfInterest
              detectedObjects={detectedObjects}
              survey={survey}
            />
          )}
          <ObjectPopup />
        </>
      )}

      {!hasValidCoordinates && hasOrthoTiles && <RegionalViewOverlay />}
      {hasOrthoTiles && <MapLegend />}
    </Map>
  );
}

function SurveyInfo({ survey }: { survey: any }) {
  return (
    <>
      <CardTitle>{survey.id}</CardTitle>
      <CardDescription>
        {`${survey.code || "N/A"} | ${survey.area_code || "N/A"} | ${
          survey.flight_date
            ? format(new Date(survey.flight_date), "dd MMMM yyyy")
            : "N/A"
        } | ${survey.location || "N/A"}`}
      </CardDescription>
    </>
  );
}

function OrthoTabContent({ survey, detectedObjects }: any) {
  const numBananas = useMemo(
    () =>
      detectedObjects.filter((obj: any) => obj.label?.includes("Banana"))
        .length,
    [detectedObjects]
  );

  const hasOrthoData = survey.ortho !== null;

  return (
    <Card className="container/card flex flex-1 flex-col lg:h-full">
      <CardHeader>
        <CardTitle>Orthomosaic</CardTitle>
        <CardDescription>{survey.id}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div>
            An orthomosaic is a high-resolution, georeferenced image created by
            stitching together multiple overlapping aerial photographs.
          </div>
          <div>
            Orthomosaics provide detailed top-down view of an area, free from
            distortions and perspective errors.
          </div>

          {hasOrthoData ? (
            <Table className="w-full table-auto text-left">
              <TableBody>
                <TableRow>
                  <TableCell>Area</TableCell>
                  <TableCell>{survey.area?.toFixed(2) || "N/A"} ha</TableCell>
                </TableRow>
                {survey.ortho?.num_images && (
                  <TableRow>
                    <TableCell>No. of Images</TableCell>
                    <TableCell>{survey.ortho.num_images}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell>Crop Inventory</TableCell>
                  <TableCell>{numBananas.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground text-center">
                Orthomosaic data is not available for this survey.
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {detectedObjects.length > 0 && (
        <>
          <CardHeader>
            <CardTitle>Plant Disease Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                Banana plant diseases pose significant threats to the
                country&apos;s banana industry and severely affects production.
              </div>
              <div>
                Timely detection allows for prompt intervention, minimizing
                damage and ensuring healthier crops.
              </div>
              <FoiSelector detectedObjects={detectedObjects} />
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}

function ThreeDTabContent({ survey }: any) {
  const hasPointCloud = survey.point_cloud !== null;

  return (
    <Card className="container/card flex flex-1 flex-col gap-4 lg:h-full">
      <CardHeader>
        <CardTitle>3D Model</CardTitle>
        <CardDescription>{survey.id}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div>
            A 3D model is a digital representation of an object or scene in
            three dimensions. It captures the shape, dimensions, and sometimes
            even the surface properties (i.e., color, texture, etc.) of a real
            world space and/or object.
          </div>
          {survey.code && <ThreeDimensionalModelSelector code={survey.code} />}
        </div>
      </CardContent>

      {hasPointCloud ? (
        <ThreeDimensionalModelCard pcd={survey.point_cloud} />
      ) : (
        <CardContent>
          <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground text-center">
              3D point cloud data is not available for this survey.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Main component
export default function SurveyMap({
  survey,
  detectedObjects,
  fallbackCenter,
}: {
  survey: any;
  detectedObjects: ComputerVisionObject[];
  fallbackCenter?: { lng: number; lat: number };
}) {
  const [activeTab, setActiveTab] = useState("ortho");
  const globalCenter = fallbackCenter || DEFAULT_CENTER;
  const safeDetectedObjects = Array.isArray(detectedObjects)
    ? detectedObjects
    : [];

  // Validation
  if (!survey || typeof survey !== "object") {
    return (
      <div className="flex flex-1 flex-col h-full items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Survey Data</CardTitle>
            <CardDescription>
              Survey information is not available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please select a survey from the list.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!survey.id) {
    return (
      <div className="flex flex-1 flex-col h-full items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invalid Survey</CardTitle>
            <CardDescription>
              Survey is missing required information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This survey is missing required identification fields.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mapCenter = useMapCenter(survey, globalCenter);
  const mapBounds = useMapBounds(survey);
  const { hasValidCoordinates, hasOrthoTiles, shouldShowMap } =
    useValidationState(survey);
  const has3DModel = survey.tags?.includes("rgb") && survey.code !== "DIFCO";

  return (
    <div className="flex flex-1 flex-col h-full gap-4 py-4 md:gap-6 md:py-6">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 h-full w-full flex-col justify-start gap-6"
      >
        <div className="flex items-center justify-between px-4 lg:px-6">
          <Label htmlFor="view-selector" className="sr-only">
            View
          </Label>

          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger
              className="@4xl/main:hidden flex w-fit"
              id="view-selector"
            >
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ortho">Orthomosaic</SelectItem>
              {has3DModel && <SelectItem value="3d">3D Model</SelectItem>}
            </SelectContent>
          </Select>

          <TabsList className="@4xl/main:flex hidden">
            <TabsTrigger value="ortho">Orthomosaic</TabsTrigger>
            {has3DModel && <TabsTrigger value="3d">3D Model</TabsTrigger>}
          </TabsList>
        </div>

        <div className="flex flex-1 h-full px-4 lg:px-6">
          <div className="grid grid-cols-1 gap-4 h-full w-full lg:grid-cols-[3fr_1fr]">
            <div className="flex flex-1 h-full">
              <Card className="container/card flex flex-1 flex-col h-full relative">
                <CardHeader>
                  <SurveyInfo survey={survey} />
                </CardHeader>
                <CardContent className="flex-1 relative">
                  {!shouldShowMap ? (
                    <NoMapDataFallback />
                  ) : (
                    <div className="flex h-96 lg:h-full">
                      {activeTab === "3d" ? (
                        <div className="flex h-full w-full min-w-0 bg-primary">
                          <ThreeDimensionalModelCaller survey={survey} />
                        </div>
                      ) : (
                        <MapView
                          survey={survey}
                          mapCenter={mapCenter}
                          mapBounds={mapBounds}
                          detectedObjects={safeDetectedObjects}
                          hasValidCoordinates={hasValidCoordinates}
                          hasOrthoTiles={hasOrthoTiles}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <TabsContent value="ortho">
              <OrthoTabContent
                survey={survey}
                detectedObjects={safeDetectedObjects}
              />
            </TabsContent>

            <TabsContent value="3d">
              <ThreeDTabContent survey={survey} />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
