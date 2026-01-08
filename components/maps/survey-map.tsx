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
import type { ComputerVisionObject } from "@/lib/types";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";

import {
  Layer,
  Map,
  MapMouseEvent,
  MapProvider,
  Popup,
  Source,
  useMap,
} from "@vis.gl/react-maplibre";
import type { MapProps } from "@vis.gl/react-maplibre";

import { format, getYear } from "date-fns";
import "maplibre-gl/dist/maplibre-gl.css";

import type {
  LngLatBoundsLike,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Point,
  Polygon,
} from "geojson";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { ThreeDimensionalModelCard } from "@/components/3d-model-card";
import { ThreeDimensionalModelSelector } from "@/components/selectors/3d-model-selector";
import { FoiSelector } from "@/components/selectors/foi-selector";
import ThreeDimensionalModelCaller from "@/components/callers/3d-caller";
import { calculateOptimalZoomLevels } from "@/lib/helpers/map-zoom";

// Constants
import { PIN_ANIMATION_STYLES } from "@/lib/constants/map-animation";
import { PIN_IMAGES } from "@/lib/constants/map-icons";
import { MAP_COLORS } from "@/lib/constants/map-colors";
import {
  createHeatmapPaint,
  createPinLayout,
} from "@/lib/constants/map-layers";

/* -------------------------------------------------------------------------- */
/* Local types                                                                */
/* -------------------------------------------------------------------------- */

type SurveyLike = {
  id: string | number;
  code?: string | null;
  flight_date?: string | Date | null;

  // coordinate sources
  min_x?: number | null;
  max_x?: number | null;
  min_y?: number | null;
  max_y?: number | null;

  tile_min_x?: number | null;
  tile_max_x?: number | null;
  tile_min_y?: number | null;
  tile_max_y?: number | null;

  geojson_boundaries?: Array<[string, string]> | Array<[number, number]> | null;

  access_code?: string | null;
  area_code?: string | null;
  area?: number | null;
  location?: string | null;
  tags?: string | null;

  ortho?: unknown | null;
  point_cloud?: unknown | null;
};

type MapCenter = { lng: number; lat: number; zoom: number };

type ObjectPopupInfo = {
  pairId: string;
  areaId?: string;
  centerLng: number;
  centerLat: number;
};

/* -------------------------------------------------------------------------- */
/* Defaults / config                                                          */
/* -------------------------------------------------------------------------- */

const DEFAULT_CENTER: MapCenter = {
  lng: 125.58147596772221,
  lat: 7.0763840759644,
  zoom: 12,
};

const MAP_CONFIG = {
  minZoom: 13,
  maxZoom: 23,
  tileSize: 256,
  orthoMinZoom: 15,
  orthoMaxZoom: 24,
};

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

const isValidNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isValidCoordinate = (lng: unknown, lat: unknown): boolean =>
  isValidNumber(lng) && isValidNumber(lat);

const hasValidMinMaxCoordinates = (survey: SurveyLike): boolean => {
  const hasOriginalCoords = [
    survey.min_x,
    survey.max_x,
    survey.min_y,
    survey.max_y,
  ].every(isValidNumber);

  const hasTileBounds = [
    survey.tile_min_x,
    survey.tile_max_x,
    survey.tile_min_y,
    survey.tile_max_y,
  ].every(isValidNumber);

  return hasOriginalCoords || hasTileBounds;
};

const hasValidBoundaries = (boundaries: SurveyLike["geojson_boundaries"]) => {
  if (!Array.isArray(boundaries) || boundaries.length === 0) return false;

  return boundaries.some((coord) => {
    if (!Array.isArray(coord) || coord.length < 2) return false;
    const [lngRaw, latRaw] = coord;
    const lng = typeof lngRaw === "string" ? Number(lngRaw) : lngRaw;
    const lat = typeof latRaw === "string" ? Number(latRaw) : latRaw;
    return isValidCoordinate(lng, lat);
  });
};

const hasOrthoTilesAvailable = (survey: SurveyLike): boolean =>
  Boolean(
    survey.ortho !== null && survey.code && survey.id && survey.flight_date
  );

function calculateCentersWithOffset(
  min_lon: number,
  max_lon: number,
  min_lat: number,
  max_lat: number
) {
  return {
    centerLng: (min_lon + max_lon) / 2,
    centerLat: (min_lat + max_lat) / 2,
  };
}

function calculateCentroid(coordinates: number[][]) {
  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < coordinates.length; i++) {
    sumX += coordinates[i][0];
    sumY += coordinates[i][1];
  }

  return [sumX / coordinates.length, sumY / coordinates.length] as const;
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

/* -------------------------------------------------------------------------- */
/* GeoJSON builders                                                           */
/* -------------------------------------------------------------------------- */

type PlantPointProps = {
  pairId: string;
  areaPairId?: string;
  label: string;
};

function generatePointsWithOffset(
  detectedObjects: ComputerVisionObject[],
  label: string
): FeatureCollection<Point, PlantPointProps> {
  const features: Array<Feature<Point, PlantPointProps>> = (
    Array.isArray(detectedObjects) ? detectedObjects : []
  )
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
        geometry: { type: "Point", coordinates: [centerLng, centerLat] },
        properties: {
          pairId: obj.pairId,
          areaPairId: obj.areaPairId,
          label: obj.label,
        },
      };
    });

  return { type: "FeatureCollection", features };
}

/* -------------------------------------------------------------------------- */
/* Hooks                                                                      */
/* -------------------------------------------------------------------------- */

const useMapCenter = (survey: SurveyLike, fallbackCenter: MapCenter) => {
  return useMemo<MapCenter>(() => {
    // PRIMARY: original min/max
    if (
      isValidNumber(survey.min_x) &&
      isValidNumber(survey.max_x) &&
      isValidNumber(survey.min_y) &&
      isValidNumber(survey.max_y)
    ) {
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

    // FALLBACK: tile bounds min/max
    if (
      isValidNumber(survey.tile_min_x) &&
      isValidNumber(survey.tile_max_x) &&
      isValidNumber(survey.tile_min_y) &&
      isValidNumber(survey.tile_max_y)
    ) {
      try {
        const { centerLng, centerLat } = calculateCentersUsingMinMaxXY(
          survey.tile_min_x,
          survey.tile_max_x,
          survey.tile_min_y,
          survey.tile_max_y
        );

        if (isValidCoordinate(centerLng, centerLat)) {
          return { lng: centerLng, lat: centerLat, zoom: 17 };
        }
      } catch (error) {
        console.error("Error calculating center from tile bounds:", error);
      }
    }

    // FALLBACK: geojson boundaries
    if (hasValidBoundaries(survey.geojson_boundaries)) {
      try {
        const extremes = findExtremeCoordinates(
          survey.geojson_boundaries as any
        );
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

    // ortho but no coords -> reasonable zoom
    if (hasOrthoTilesAvailable(survey)) {
      return { ...fallbackCenter, zoom: MAP_CONFIG.orthoMinZoom };
    }

    return { ...fallbackCenter, zoom: fallbackCenter.zoom ?? 12 };
  }, [survey, fallbackCenter]);
};

const useMapBounds = (survey: SurveyLike) => {
  return useMemo<LngLatBoundsLike | undefined>(() => {
    if (!hasValidBoundaries(survey.geojson_boundaries)) return undefined;

    try {
      const extremes = findExtremeCoordinates(survey.geojson_boundaries as any);
      if (!extremes) return undefined;

      const { minLng, minLat, maxLng, maxLat } = extremes;

      if (
        !isValidCoordinate(minLng, minLat) ||
        !isValidCoordinate(maxLng, maxLat)
      ) {
        return undefined;
      }

      return [
        [minLng, minLat],
        [maxLng, maxLat],
      ] satisfies LngLatBoundsLike;
    } catch (error) {
      console.error("Error calculating bounds:", error);
      return undefined;
    }
  }, [survey.geojson_boundaries]);
};

const useValidationState = (survey: SurveyLike) => {
  return useMemo(() => {
    const hasValidCoordinates =
      hasValidMinMaxCoordinates(survey) ||
      hasValidBoundaries(survey.geojson_boundaries);

    const hasOrthoTiles = hasOrthoTilesAvailable(survey);
    const shouldShowMap = hasOrthoTiles || hasValidCoordinates;

    return { hasValidCoordinates, hasOrthoTiles, shouldShowMap };
  }, [survey]);
};

/* -------------------------------------------------------------------------- */
/* Map sub-components                                                         */
/* -------------------------------------------------------------------------- */

function useSurveyMapInstance(): MapLibreMap | undefined {
  const maps = useMap() as unknown as Record<string, MapLibreMap | undefined>;
  return maps["survey-map"];
}

function SurveyMapEvents({
  survey,
  detectedObjects,
}: {
  survey: SurveyLike;
  detectedObjects: ComputerVisionObject[];
}) {
  const map = useSurveyMapInstance();
  const { setPopupInfo, setHoveredPairId } = useSurveyMapStore(
    (state) => state
  );

  const handleBboxClick = useCallback(
    (e: MapMouseEvent) => {
      const objectPairId = e.features?.[0]?.properties?.pairId as
        | string
        | undefined;
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
      const pairId = e.features?.[0]?.properties?.pairId as string | undefined;
      setHoveredPairId(pairId || null);

      if (pairId && map) map.getCanvas().style.cursor = "pointer";
    },
    [map, setHoveredPairId]
  );

  const handlePinLeave = useCallback(() => {
    setHoveredPairId(null);
    if (map) map.getCanvas().style.cursor = "";
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
    } as const;

    const clickLayers = LAYER_TYPES.CLICK.map((id) => `${survey.id}-${id}`);
    const hoverLayers = LAYER_TYPES.HOVER.map((id) => `${survey.id}-${id}`);

    clickLayers.forEach((layer) => map.on("click", layer, handleBboxClick));
    hoverLayers.forEach((layer) => {
      map.on("mouseenter", layer, handlePinHover);
      map.on("mouseleave", layer, handlePinLeave);
    });

    return () => {
      clickLayers.forEach((layer) => {
        map.off("click", layer, handleBboxClick);
      });
      hoverLayers.forEach((layer) => {
        map.off("mouseenter", layer, handlePinHover);
        map.off("mouseleave", layer, handlePinLeave);
      });
    };
  }, [map, survey.id, handleBboxClick, handlePinHover, handlePinLeave]);

  return null;
}

function InitializeMapImages() {
  const map = useSurveyMapInstance();

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
          if (!map.hasImage(id)) map.addImage(id, imageData);
        } catch (error) {
          console.warn(`Failed to add image ${id}:`, error);
        } finally {
          if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
        }
      };

      img.onerror = (e) => {
        console.error(`Failed to load SVG image for ${id}`, e);
        if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
      };

      // ✅ avoid btoa/unicode issues
      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      img.src = URL.createObjectURL(blob);
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
            <div
              className="w-1 h-4 rounded-full"
              style={{ backgroundColor: MAP_COLORS.boundary }}
            />
            Map Legend
          </h3>

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 group">
              <div
                className="w-8 h-8 rounded-full border-2 border-black shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg mt-0.5"
                style={{
                  background: `linear-gradient(135deg, ${MAP_COLORS.healthy.base} 0%, ${MAP_COLORS.healthy.base} 100%)`,
                }}
              />
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
              <div
                className="w-8 h-8 rounded-full border-2 border-black shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg mt-0.5"
                style={{
                  background: `linear-gradient(135deg, ${MAP_COLORS.unhealthy.base} 0%, ${MAP_COLORS.unhealthy.base} 100%)`,
                }}
              />
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
                      `rgba(${MAP_COLORS.healthy.heatmap}, 0.15)`,
                      `rgba(${MAP_COLORS.healthy.heatmap}, 0.3)`,
                      `rgba(${MAP_COLORS.healthy.heatmap}, 0.45)`,
                      `rgba(${MAP_COLORS.healthy.heatmap}, 0.6)`,
                      `rgba(${MAP_COLORS.healthy.heatmap}, 0.75)`,
                    ].map((c, i) => (
                      <div
                        key={i}
                        className="w-6 h-6"
                        style={{ backgroundColor: c }}
                      />
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
                className="w-3.5 h-3.5"
                style={{ color: MAP_COLORS.boundary }}
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
  survey: SurveyLike;
}) {
  const { selectedFoi, popupInfo, hoveredPairId } = useSurveyMapStore(
    (state) => state
  );

  const id = survey?.id;
  if (!id) return null;

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

  const selectedPlantBbox = useMemo<FeatureCollection<
    Polygon,
    GeoJsonProperties
  > | null>(() => {
    const selectedId =
      (popupInfo as ObjectPopupInfo | null)?.pairId || hoveredPairId;
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

  const isHealthy =
    selectedPlantBbox?.features[0]?.properties &&
    String((selectedPlantBbox.features[0].properties as any).label).includes(
      "Healthy"
    );

  const selectedColor = isHealthy
    ? MAP_COLORS.healthy.base
    : MAP_COLORS.unhealthy.base;

  const healthyZoomLevels = useMemo(() => {
    return calculateOptimalZoomLevels(healthyBananas.features as any);
  }, [healthyBananas.features]);

  const unhealthyZoomLevels = useMemo(() => {
    return calculateOptimalZoomLevels(unhealthyBananas.features as any);
  }, [unhealthyBananas.features]);

  const showHealthy = selectedFoi === "healthy" || selectedFoi === "all";
  const showUnhealthy = selectedFoi === "unhealthy" || selectedFoi === "all";

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
              "fill-color": selectedColor,
              "fill-opacity": 0.15,
            }}
          />
          <Layer
            id={`${id}-selected-bbox-outline`}
            type="line"
            paint={{
              "line-color": selectedColor,
              "line-width": 2,
              "line-opacity": 0.8,
              "line-dasharray": [2, 2],
            }}
          />
        </Source>
      )}

      {showHealthy && (
        <>
          <Source
            id={`${id}-healthy`}
            type="geojson"
            data={healthyBananas as any}
          >
            <Layer
              id={`${id}-healthy-heatmap`}
              type="heatmap"
              maxzoom={healthyZoomLevels.heatmapMaxZoom}
              paint={createHeatmapPaint("healthy")}
            />
          </Source>

          <Source
            id={`${id}-healthy-circles`}
            type="geojson"
            data={healthyBananas as any}
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
                "circle-color": MAP_COLORS.healthy.base,
                "circle-opacity": 0.4,
                "circle-stroke-color": MAP_COLORS.healthy.base,
                "circle-stroke-width": 2,
                "circle-stroke-opacity": 0.8,
              }}
            />
          </Source>

          <Source
            id={`${id}-healthy-pins`}
            type="geojson"
            data={healthyBananas as any}
          >
            <Layer
              id={`${id}-healthy-pin`}
              type="symbol"
              minzoom={healthyZoomLevels.pinMinZoom}
              layout={createPinLayout("pin-yellow")}
              paint={{ "icon-opacity": 0.75 }}
            />
          </Source>
        </>
      )}

      {showUnhealthy && (
        <>
          <Source
            id={`${id}-unhealthy`}
            type="geojson"
            data={unhealthyBananas as any}
          >
            <Layer
              id={`${id}-unhealthy-heatmap`}
              type="heatmap"
              maxzoom={unhealthyZoomLevels.heatmapMaxZoom}
              paint={createHeatmapPaint("unhealthy")}
            />
          </Source>

          <Source
            id={`${id}-unhealthy-circles`}
            type="geojson"
            data={unhealthyBananas as any}
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
                "circle-color": MAP_COLORS.unhealthy.base,
                "circle-opacity": 0.4,
                "circle-stroke-color": MAP_COLORS.unhealthy.base,
                "circle-stroke-width": 2,
                "circle-stroke-opacity": 0.8,
              }}
            />
          </Source>

          <Source
            id={`${id}-unhealthy-pins`}
            type="geojson"
            data={unhealthyBananas as any}
          >
            <Layer
              id={`${id}-unhealthy-pin`}
              type="symbol"
              minzoom={unhealthyZoomLevels.pinMinZoom}
              layout={createPinLayout("pin-red")}
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
  const info = popupInfo as ObjectPopupInfo | null;

  if (!info) return null;

  return (
    <Popup
      anchor="bottom"
      longitude={info.centerLng}
      latitude={info.centerLat}
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
              {info.centerLng.toFixed(6)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span>Latitude:</span>
            <span className="text-muted-foreground">
              {info.centerLat.toFixed(6)}
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

function SurveyBoundaries({ survey }: { survey: SurveyLike }) {
  if (!survey.geojson_boundaries || !Array.isArray(survey.geojson_boundaries))
    return null;

  const ring: number[][] = survey.geojson_boundaries
    .map((pair) => {
      const lngRaw = pair[0];
      const latRaw = pair[1];
      const lng = typeof lngRaw === "string" ? Number(lngRaw) : lngRaw;
      const lat = typeof latRaw === "string" ? Number(latRaw) : latRaw;
      return [lng, lat];
    })
    .filter((p) => isValidCoordinate(p[0], p[1]));

  if (ring.length < 3) return null;

  const polygonFeature: Feature<Polygon, GeoJsonProperties> = {
    type: "Feature",
    properties: { survey_id: survey.id },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };

  const centroid = calculateCentroid(ring);
  const labelFeature: Feature<Point, GeoJsonProperties> = {
    type: "Feature",
    properties: {
      survey_id: survey.id,
      label: `${survey.access_code ?? ""}-${survey.area_code ?? ""}`,
    },
    geometry: { type: "Point", coordinates: centroid },
  };

  const polygonFC: FeatureCollection<Polygon, GeoJsonProperties> = {
    type: "FeatureCollection",
    features: [polygonFeature],
  };

  const labelFC: FeatureCollection<Point, GeoJsonProperties> = {
    type: "FeatureCollection",
    features: [labelFeature],
  };

  return (
    <>
      <Source id="survey-boundary" type="geojson" data={polygonFC} generateId>
        <Layer
          id="boundary-fill"
          type="fill"
          paint={{
            "fill-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              MAP_COLORS.boundary,
              MAP_COLORS.hover,
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.7,
              0.4,
            ],
          }}
        />

        <Layer
          id="boundary-border"
          type="line"
          paint={{
            "line-color": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              MAP_COLORS.boundary,
              MAP_COLORS.hover,
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

        <Layer
          id="boundary-glow"
          type="line"
          paint={{
            "line-color": MAP_COLORS.boundary,
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

      <Source id="survey-boundary-label" type="geojson" data={labelFC}>
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
            "text-halo-color": MAP_COLORS.boundary,
            "text-halo-width": 2,
            "text-halo-blur": 1,
          }}
        />
      </Source>
    </>
  );
}

function SurveyBoundaryEvents() {
  const map = useSurveyMapInstance();
  const hoveredFeatureIdRef = useRef<number | string | null>(null);

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

/* -------------------------------------------------------------------------- */
/* MapView                                                                    */
/* -------------------------------------------------------------------------- */

function MapView({
  survey,
  mapCenter,
  mapBounds,
  detectedObjects,
  hasValidCoordinates,
  hasOrthoTiles,
}: {
  survey: SurveyLike;
  mapCenter: MapCenter;
  mapBounds?: LngLatBoundsLike;
  detectedObjects: ComputerVisionObject[];
  hasValidCoordinates: boolean;
  hasOrthoTiles: boolean;
}) {
  const [hasZoomed, setHasZoomed] = useState(false);
  const loadedTilesRef = useRef<Set<string>>(new Set());
  const zoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapStyle = useMemo<StyleSpecification>(
    () => ({
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
    }),
    []
  );

  const initialViewState = useMemo<MapProps["initialViewState"]>(() => {
    const shouldFit = hasValidCoordinates && !!mapBounds;

    return {
      longitude: mapCenter.lng,
      latitude: mapCenter.lat,
      zoom: shouldFit ? undefined : mapCenter.zoom,
      bounds: shouldFit ? mapBounds ?? undefined : undefined, // ✅ null-safe
      fitBoundsOptions: shouldFit ? { padding: 50 } : undefined,
    };
  }, [
    mapCenter.lng,
    mapCenter.lat,
    mapCenter.zoom,
    hasValidCoordinates,
    mapBounds,
  ]);

  // Auto-zoom to ortho tiles when we only have tiles but no coordinates
  const map = useSurveyMapInstance();

  useEffect(() => {
    if (!map || !hasOrthoTiles || hasValidCoordinates || hasZoomed) return;

    const handleSourceData = (e: any) => {
      if (e.sourceId !== "ortho") return;
      if (!e.isSourceLoaded) return;

      if (e.tile) {
        const tileKey = `${e.tile.tileID.canonical.z}/${e.tile.tileID.canonical.x}/${e.tile.tileID.canonical.y}`;
        loadedTilesRef.current.add(tileKey);
      }

      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);

      zoomTimeoutRef.current = setTimeout(() => {
        if (loadedTilesRef.current.size > 0 && !hasZoomed) performAutoZoom();
      }, 1000);
    };

    const performAutoZoom = () => {
      if (hasZoomed || loadedTilesRef.current.size === 0) return;

      let minLng = Infinity,
        maxLng = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity;

      loadedTilesRef.current.forEach((tileKey) => {
        const [z, x, y] = tileKey.split("/").map(Number);
        const b = tileToBounds(x, y, z);
        minLng = Math.min(minLng, b[0]);
        minLat = Math.min(minLat, b[1]);
        maxLng = Math.max(maxLng, b[2]);
        maxLat = Math.max(maxLat, b[3]);
      });

      if (![minLng, maxLng, minLat, maxLat].every(Number.isFinite)) return;

      const lngBuffer = (maxLng - minLng) * 0.1;
      const latBuffer = (maxLat - minLat) * 0.1;

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

    map.on("sourcedata", handleSourceData);

    return () => {
      map.off("sourcedata", handleSourceData);
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    };
  }, [map, hasOrthoTiles, hasValidCoordinates, hasZoomed]);

  useEffect(() => {
    setHasZoomed(false);
    loadedTilesRef.current.clear();
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
      zoomTimeoutRef.current = null;
    }
  }, [survey.id]);

  const codeLower = String(survey.code ?? "").toLowerCase();
  const flightYear =
    survey.flight_date != null
      ? getYear(new Date(survey.flight_date as any))
      : undefined;

  return (
    <Map
      id="survey-map"
      initialViewState={initialViewState}
      minZoom={MAP_CONFIG.minZoom}
      maxZoom={MAP_CONFIG.maxZoom}
      mapStyle={mapStyle}
      doubleClickZoom={false}
    >
      <style>{PIN_ANIMATION_STYLES}</style>

      <InitializeMapImages />
      <SurveyMapEvents survey={survey} detectedObjects={detectedObjects} />

      {!hasOrthoTiles && hasValidCoordinates && (
        <>
          <SurveyBoundaries survey={survey} />
          <SurveyBoundaryEvents />
        </>
      )}

      {hasOrthoTiles &&
        survey.code &&
        survey.flight_date &&
        flightYear != null && (
          <>
            <Source
              id="ortho"
              type="raster"
              tiles={[
                `/asimov-hawks/tiles/${codeLower}/${flightYear}/${survey.id}/ortho/sharp-corners/{z}/{x}/{y}.png`,
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

/* -------------------------------------------------------------------------- */
/* Right-side panels                                                          */
/* -------------------------------------------------------------------------- */

function SurveyInfo({ survey }: { survey: SurveyLike }) {
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

function OrthoTabContent({
  survey,
  detectedObjects,
}: {
  survey: SurveyLike;
  detectedObjects: ComputerVisionObject[];
}) {
  const numBananas = useMemo(
    () => detectedObjects.filter((obj) => obj.label?.includes("Banana")).length,
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
                  <TableCell>
                    {survey.area != null ? survey.area.toFixed(2) : "N/A"} ha
                  </TableCell>
                </TableRow>

                {(survey as any).ortho?.num_images && (
                  <TableRow>
                    <TableCell>No. of Images</TableCell>
                    <TableCell>{(survey as any).ortho.num_images}</TableCell>
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

function ThreeDTabContent({ survey }: { survey: SurveyLike }) {
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

          {survey.code && (
            <ThreeDimensionalModelSelector code={String(survey.code)} />
          )}
        </div>
      </CardContent>

      {hasPointCloud ? (
        <ThreeDimensionalModelCard pcd={survey.point_cloud as any} />
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

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function SurveyMap({
  survey,
  detectedObjects,
  fallbackCenter,
}: {
  survey: SurveyLike;
  detectedObjects: ComputerVisionObject[] | null | undefined;
  fallbackCenter?: { lng: number; lat: number };
}) {
  const [activeTab, setActiveTab] = useState("ortho");

  const globalCenter: MapCenter = {
    ...(fallbackCenter
      ? { ...DEFAULT_CENTER, ...fallbackCenter }
      : DEFAULT_CENTER),
    zoom: DEFAULT_CENTER.zoom,
  };

  const safeDetectedObjects = Array.isArray(detectedObjects)
    ? detectedObjects
    : [];

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

  const has3DModel = Boolean(
    survey.tags?.includes("rgb") && survey.code !== "DIFCO"
  );

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
                          <ThreeDimensionalModelCaller survey={survey as any} />
                        </div>
                      ) : (
                        <MapProvider>
                          <MapView
                            survey={survey}
                            mapCenter={mapCenter}
                            mapBounds={mapBounds}
                            detectedObjects={safeDetectedObjects}
                            hasValidCoordinates={hasValidCoordinates}
                            hasOrthoTiles={hasOrthoTiles}
                          />
                        </MapProvider>
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
