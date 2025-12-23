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
import { useCallback, useEffect, useMemo, useState } from "react";
import { ThreeDimensionalModelCard } from "@/components/3d-model-card";
import { ThreeDimensionalModelSelector } from "@/components/selectors/3d-model-selector";
import { FoiSelector } from "@/components/selectors/foi-selector";
import ThreeDimensionalModelCaller from "@/components/callers/3d-caller";

// Pin SVG images with shadow for depth
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

// Default center (Mindanao, Philippines - matches your global center)
const DEFAULT_CENTER = {
  lng: 125.58147596772221,
  lat: 7.0763840759644,
  zoom: 12,
};

/**
 * Calculate optimal zoom levels based on data density
 */
function calculateOptimalZoomLevels(features: any[]) {
  if (!features || features.length === 0) {
    return { heatmapMaxZoom: 15, pinMinZoom: 15 };
  }

  const coords = features
    .filter((f) => f.geometry?.coordinates)
    .map((f) => f.geometry.coordinates);

  if (coords.length === 0) {
    return { heatmapMaxZoom: 15, pinMinZoom: 15 };
  }

  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;
  const avgSpan = (lonSpan + latSpan) / 2;

  let zoomThreshold = 15;

  if (avgSpan > 0.1) {
    zoomThreshold = 17;
  } else if (avgSpan > 0.01) {
    zoomThreshold = 16;
  } else {
    zoomThreshold = 19;
  }

  const density = features.length / (avgSpan * avgSpan || 1);

  if (density > 1000) {
    zoomThreshold = Math.min(19, zoomThreshold + 1);
  } else if (density < 10) {
    zoomThreshold = Math.max(13, zoomThreshold - 2);
  }

  return {
    heatmapMaxZoom: zoomThreshold,
    pinMinZoom: zoomThreshold,
  };
}

/**
 * Calculate centers with smart offset for better pin positioning
 */
function calculateCentersWithOffset(
  min_lon: number,
  max_lon: number,
  min_lat: number,
  max_lat: number,
  objectType?: string
) {
  const centerLng = (min_lon + max_lon) / 2;
  const centerLat = (min_lat + max_lat) / 2;
  return { centerLng, centerLat };
}

/**
 * Generate point feature collection with smart offset
 */
function generatePointsWithOffset(
  detectedObjects: ComputerVisionObject[],
  label: string
) {
  if (!detectedObjects || !Array.isArray(detectedObjects)) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const filteredObjects = detectedObjects.filter((obj) => obj.label === label);

  const features = filteredObjects.map((obj) => {
    const { centerLng, centerLat } = calculateCentersWithOffset(
      obj.bbox.min_lon,
      obj.bbox.max_lon,
      obj.bbox.min_lat,
      obj.bbox.max_lat,
      obj.label
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

  return {
    type: "FeatureCollection",
    features,
  };
}

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
      if (!e.features?.length) return;

      const objectPairId = e.features[0]?.properties?.pairId;
      if (!objectPairId) return;

      const clickedObject = detectedObjects.find(
        (object: ComputerVisionObject) => object.pairId === objectPairId
      );
      if (!clickedObject) return;

      const {
        pairId,
        areaPairId: areaId,
        bbox: { max_lat, max_lon, min_lat, min_lon },
      } = clickedObject;

      const { centerLng, centerLat } = calculateCentersWithOffset(
        min_lon,
        max_lon,
        min_lat,
        max_lat,
        clickedObject.label
      );

      setPopupInfo({ pairId, areaId, centerLng, centerLat });
    },
    [detectedObjects, setPopupInfo]
  );

  const handlePinHover = useCallback(
    (e: MapMouseEvent) => {
      if (!e.features?.length) return;
      const pairId = e.features[0]?.properties?.pairId;
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

    map.on("click", `${survey.id}-unhealthy-fill`, handleBboxClick);
    map.on("click", `${survey.id}-unhealthy-pin`, handleBboxClick);
    map.on("click", `${survey.id}-healthy-pin`, handleBboxClick);
    map.on("click", `${survey.id}-unhealthy-circle`, handleBboxClick);
    map.on("click", `${survey.id}-healthy-circle`, handleBboxClick);

    map.on("mouseenter", `${survey.id}-unhealthy-pin`, handlePinHover);
    map.on("mouseleave", `${survey.id}-unhealthy-pin`, handlePinLeave);
    map.on("mouseenter", `${survey.id}-healthy-pin`, handlePinHover);
    map.on("mouseleave", `${survey.id}-healthy-pin`, handlePinLeave);
    map.on("mouseenter", `${survey.id}-unhealthy-circle`, handlePinHover);
    map.on("mouseleave", `${survey.id}-unhealthy-circle`, handlePinLeave);
    map.on("mouseenter", `${survey.id}-healthy-circle`, handlePinHover);
    map.on("mouseleave", `${survey.id}-healthy-circle`, handlePinLeave);

    return () => {
      map.off("click", `${survey.id}-unhealthy-fill`, handleBboxClick);
      map.off("click", `${survey.id}-unhealthy-pin`, handleBboxClick);
      map.off("click", `${survey.id}-healthy-pin`, handleBboxClick);
      map.off("click", `${survey.id}-unhealthy-circle`, handleBboxClick);
      map.off("click", `${survey.id}-healthy-circle`, handleBboxClick);

      map.off("mouseenter", `${survey.id}-unhealthy-pin`, handlePinHover);
      map.off("mouseleave", `${survey.id}-unhealthy-pin`, handlePinLeave);
      map.off("mouseenter", `${survey.id}-healthy-pin`, handlePinHover);
      map.off("mouseleave", `${survey.id}-healthy-pin`, handlePinLeave);
      map.off("mouseenter", `${survey.id}-unhealthy-circle`, handlePinHover);
      map.off("mouseleave", `${survey.id}-unhealthy-circle`, handlePinLeave);
      map.off("mouseenter", `${survey.id}-healthy-circle`, handlePinHover);
      map.off("mouseleave", `${survey.id}-healthy-circle`, handlePinLeave);
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
      img.onerror = () => {
        console.error(`Failed to load SVG image for ${id}`);
      };
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
    <div className="absolute bottom-8 left-8 z-10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        title={isOpen ? "Hide legend" : "Show legend"}
      >
        <svg
          className={`w-5 h-5 text-gray-700 transition-transform ${
            isOpen ? "rotate-0" : "rotate-180"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 5l7 7m0 0l-7 7m7-7H6"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs border border-gray-200 animate-in fade-in slide-in-from-left-2 duration-200">
          <div className="text-sm font-semibold text-gray-800 mb-3">Legend</div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-white shadow-md"></div>
              <div className="text-xs text-gray-700">
                <div className="font-medium">Healthy Plants</div>
                <div className="text-gray-500">No signs of disease</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-md"></div>
              <div className="text-xs text-gray-700">
                <div className="font-medium">Infected Plants</div>
                <div className="text-gray-500">Disease detected</div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-2">
                Heatmap (Zoomed Out)
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-yellow-200"></div>
                  <div className="w-3 h-3 bg-yellow-300"></div>
                  <div className="w-3 h-3 bg-yellow-400"></div>
                  <div className="w-3 h-3 bg-yellow-500"></div>
                </div>
                <span className="text-gray-600 text-xs">
                  Low → High Density
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-3 italic">
            Hover or click plants to see detection area
          </div>
        </div>
      )}
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
  if (!id) return null;

  const healthyBananas = useMemo(() => {
    if (!detectedObjects) return { type: "FeatureCollection", features: [] };
    return generatePointsWithOffset(
      detectedObjects,
      "Banana Plant (Healthy-looking)"
    );
  }, [detectedObjects]);

  const unhealthyBananas = useMemo(() => {
    if (!detectedObjects) return { type: "FeatureCollection", features: [] };
    return generatePointsWithOffset(detectedObjects, "Banana Plant (Infected)");
  }, [detectedObjects]);

  const selectedPlantBbox = useMemo(() => {
    if (!popupInfo && !hoveredPairId) return null;

    const selectedId = popupInfo?.pairId || hoveredPairId;
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

      {(selectedFoi === "healthy" || selectedFoi === "all") && (
        <Source id={`${id}-healthy`} type="geojson" data={healthyBananas}>
          <Layer
            id={`${id}-healthy-heatmap`}
            type="heatmap"
            source={`${id}-healthy`}
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
      )}

      {(selectedFoi === "unhealthy" || selectedFoi === "all") && (
        <Source id={`${id}-unhealthy`} type="geojson" data={unhealthyBananas}>
          <Layer
            id={`${id}-unhealthy-heatmap`}
            type="heatmap"
            source={`${id}-unhealthy`}
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
      )}

      {(selectedFoi === "healthy" || selectedFoi === "all") && (
        <Source
          id={`${id}-healthy-circles`}
          type="geojson"
          data={healthyBananas}
        >
          <Layer
            id={`${id}-healthy-circle`}
            type="circle"
            source={`${id}-healthy-circles`}
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
      )}

      {(selectedFoi === "unhealthy" || selectedFoi === "all") && (
        <Source
          id={`${id}-unhealthy-circles`}
          type="geojson"
          data={unhealthyBananas}
        >
          <Layer
            id={`${id}-unhealthy-circle`}
            type="circle"
            source={`${id}-unhealthy-circles`}
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
      )}

      {(selectedFoi === "healthy" || selectedFoi === "all") && (
        <Source id={`${id}-healthy-pins`} type="geojson" data={healthyBananas}>
          <Layer
            id={`${id}-healthy-pin`}
            type="symbol"
            source={`${id}-healthy-pins`}
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
            paint={{
              "icon-opacity": 0.75,
            }}
          />
        </Source>
      )}

      {(selectedFoi === "unhealthy" || selectedFoi === "all") && (
        <Source
          id={`${id}-unhealthy-pins`}
          type="geojson"
          data={unhealthyBananas}
        >
          <Layer
            id={`${id}-unhealthy-pin`}
            type="symbol"
            source={`${id}-unhealthy-pins`}
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
            paint={{
              "icon-opacity": 0.75,
            }}
          />
        </Source>
      )}
    </>
  );
}

function ObjectPopup() {
  const { popupInfo, setPopupInfo } = useSurveyMapStore((state) => state);

  if (popupInfo === null) return null;

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
            <span>Object ID:</span>
            <span className="text-muted-foreground">{pairId}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span>Area ID:</span>
            <span className="text-muted-foreground">{areaId}</span>
          </div>
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

  // Use provided fallback or default
  const globalCenter = fallbackCenter || DEFAULT_CENTER;

  // Basic null checks
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

  const safeDetectedObjects = Array.isArray(detectedObjects)
    ? detectedObjects
    : [];

  // Calculate center with proper null checks and NaN validation
  const mapCenter = useMemo(() => {
    // Try to use min/max coordinates if available
    if (
      survey.min_x != null &&
      survey.max_x != null &&
      survey.min_y != null &&
      survey.max_y != null
    ) {
      try {
        const { centerLng, centerLat } = calculateCentersUsingMinMaxXY(
          survey.min_x,
          survey.max_x,
          survey.min_y,
          survey.max_y
        );

        // Validate the result is not NaN
        if (
          !isNaN(centerLng) &&
          !isNaN(centerLat) &&
          isFinite(centerLng) &&
          isFinite(centerLat)
        ) {
          return { lng: centerLng, lat: centerLat, zoom: 17 };
        } else {
          console.warn("Calculated center resulted in NaN or Infinity:", {
            centerLng,
            centerLat,
          });
        }
      } catch (error) {
        console.error("Error calculating center from min/max:", error);
      }
    }

    // Try to use geojson_boundaries if available
    if (
      survey.geojson_boundaries &&
      Array.isArray(survey.geojson_boundaries) &&
      survey.geojson_boundaries.length > 0
    ) {
      try {
        const extremes = findExtremeCoordinates(survey.geojson_boundaries);
        if (extremes) {
          const centerLng = (extremes.minLng + extremes.maxLng) / 2;
          const centerLat = (extremes.minLat + extremes.maxLat) / 2;

          // Validate the result is not NaN
          if (
            !isNaN(centerLng) &&
            !isNaN(centerLat) &&
            isFinite(centerLng) &&
            isFinite(centerLat)
          ) {
            return { lng: centerLng, lat: centerLat, zoom: 17 };
          } else {
            console.warn(
              "Calculated center from boundaries resulted in NaN or Infinity:",
              { centerLng, centerLat }
            );
          }
        }
      } catch (error) {
        console.error("Error calculating center from boundaries:", error);
      }
    }

    // Fallback to global center
    console.warn("Using global fallback center - no valid coordinates found");
    return { ...globalCenter, zoom: globalCenter.zoom || 12 };
  }, [survey, globalCenter]);

  // Calculate bounds with proper null checks and NaN validation
  const mapBounds = useMemo(() => {
    if (
      !survey.geojson_boundaries ||
      !Array.isArray(survey.geojson_boundaries) ||
      survey.geojson_boundaries.length === 0
    ) {
      return null;
    }

    try {
      const extremes = findExtremeCoordinates(survey.geojson_boundaries);
      if (!extremes) return null;

      // Validate bounds are not NaN or Infinity
      const { minLng, minLat, maxLng, maxLat } = extremes;
      if (
        isNaN(minLng) ||
        isNaN(minLat) ||
        isNaN(maxLng) ||
        isNaN(maxLat) ||
        !isFinite(minLng) ||
        !isFinite(minLat) ||
        !isFinite(maxLng) ||
        !isFinite(maxLat)
      ) {
        console.warn(
          "Calculated bounds resulted in NaN or Infinity:",
          extremes
        );
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

  const numBananas = useMemo(() => {
    return safeDetectedObjects.filter((obj) => obj.label?.includes("Banana"))
      .length;
  }, [safeDetectedObjects]);

  // Check if survey has valid map data (updated to check for NaN)
  const hasValidCoordinates = useMemo(() => {
    // Check min/max coordinates
    if (
      survey.min_x != null &&
      survey.max_x != null &&
      survey.min_y != null &&
      survey.max_y != null
    ) {
      const hasValidMinMax =
        !isNaN(survey.min_x) &&
        !isNaN(survey.max_x) &&
        !isNaN(survey.min_y) &&
        !isNaN(survey.max_y) &&
        isFinite(survey.min_x) &&
        isFinite(survey.max_x) &&
        isFinite(survey.min_y) &&
        isFinite(survey.max_y);
      if (hasValidMinMax) return true;
    }

    // Check geojson_boundaries
    if (
      survey.geojson_boundaries &&
      Array.isArray(survey.geojson_boundaries) &&
      survey.geojson_boundaries.length > 0
    ) {
      // Validate that at least one coordinate pair is valid
      const hasValidBoundary = survey.geojson_boundaries.some((coord: any) => {
        if (!Array.isArray(coord) || coord.length < 2) return false;
        const [lng, lat] = coord;
        return !isNaN(lng) && !isNaN(lat) && isFinite(lng) && isFinite(lat);
      });
      if (hasValidBoundary) return true;
    }

    return false;
  }, [survey]);

  // Check if ortho tiles are available
  const hasOrthoTiles =
    survey.ortho !== null && survey.code && survey.id && survey.flight_date;

  // Show map if we have coordinates OR if we have ortho tiles (will use fallback center)
  const shouldShowMap = hasValidCoordinates || hasOrthoTiles;

  return (
    <div className="flex flex-1 flex-col h-full gap-4 py-4 md:gap-6 md:py-6">
      <Tabs
        defaultValue="ortho"
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
              {survey.tags?.includes("rgb") && survey.code !== "DIFCO" && (
                <SelectItem value="3d">3D Model</SelectItem>
              )}
            </SelectContent>
          </Select>
          <TabsList className="@4xl/main:flex hidden">
            <TabsTrigger value="ortho">Orthomosaic</TabsTrigger>
            {survey.tags?.includes("rgb") && survey.code !== "DIFCO" && (
              <TabsTrigger value="3d">3D Model</TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="flex flex-1 h-full px-4 lg:px-6">
          <div className="grid grid-cols-1 gap-4 h-full w-full lg:grid-cols-[3fr_1fr]">
            <div className="flex flex-1 h-full">
              <Card className="container/card flex flex-1 flex-col h-full relative">
                <CardHeader>
                  <CardTitle>{survey.id}</CardTitle>
                  <CardDescription>
                    {`${survey.code || "N/A"} | ${
                      survey.area_code || "N/A"
                    } | ${
                      survey.flight_date
                        ? format(new Date(survey.flight_date), "dd MMMM yyyy")
                        : "N/A"
                    } | ${survey.location || "N/A"}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 relative">
                  {!shouldShowMap ? (
                    <div className="flex h-96 lg:h-full items-center justify-center bg-muted/10 rounded-lg border-2 border-dashed">
                      <div className="text-center p-8">
                        <p className="font-semibold text-lg mb-2">
                          No Map Data Available
                        </p>
                        <p className="text-sm text-muted-foreground">
                          This survey does not have coordinate data or
                          orthomosaic tiles to display.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-96 lg:h-full">
                      {activeTab !== "3d" ? (
                        <Map
                          id="survey-map"
                          initialViewState={{
                            longitude: mapCenter.lng,
                            latitude: mapCenter.lat,
                            zoom: mapBounds ? undefined : mapCenter.zoom,
                            bounds: mapBounds || undefined,
                            fitBoundsOptions: { padding: 50 },
                          }}
                          minZoom={13}
                          maxZoom={23}
                          mapStyle={{
                            version: 8,
                            sources: {
                              osm: {
                                type: "raster",
                                tiles: [
                                  "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
                                ],
                                tileSize: 256,
                                attribution:
                                  "&copy; OpenStreetMap Contributors",
                              },
                            },
                            layers: [
                              {
                                id: "osm",
                                type: "raster",
                                source: "osm",
                              },
                            ],
                          }}
                          doubleClickZoom={false}
                        >
                          <InitializeMapImages />
                          <SurveyMapEvents
                            survey={survey}
                            detectedObjects={safeDetectedObjects}
                          />
                          {activeTab === "ortho" && hasOrthoTiles && (
                            <>
                              <Source
                                id="ortho"
                                type="raster"
                                tiles={[
                                  `/asimov-hawks/tiles/${survey.code.toLowerCase()}/${getYear(
                                    new Date(survey.flight_date)
                                  )}/${
                                    survey.id
                                  }/${activeTab}/sharp-corners/{z}/{x}/{y}.png`,
                                ]}
                                tileSize={256}
                                scheme="tms"
                                minzoom={15}
                                maxzoom={24}
                              >
                                <Layer
                                  id="ortho"
                                  type="raster"
                                  source="ortho"
                                  minzoom={15}
                                  maxzoom={24}
                                  paint={{
                                    "raster-opacity": 1,
                                  }}
                                />
                              </Source>
                              {safeDetectedObjects.length > 0 && (
                                <FeaturesOfInterest
                                  detectedObjects={safeDetectedObjects}
                                  survey={survey}
                                />
                              )}
                              <ObjectPopup />
                            </>
                          )}

                          {/* Show warning overlay when using fallback center */}
                          {!hasValidCoordinates && hasOrthoTiles && (
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                              <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg text-sm">
                                <span className="font-semibold">
                                  ⚠️ Approximate Location:
                                </span>{" "}
                                Survey coordinates unavailable, showing regional
                                map
                              </div>
                            </div>
                          )}

                          <MapLegend />
                        </Map>
                      ) : (
                        <div className="flex h-full w-full min-w-0 bg-primary">
                          <ThreeDimensionalModelCaller survey={survey} />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <TabsContent value="ortho">
              <Card className="container/card flex flex-1 flex-col lg:h-full">
                <CardHeader>
                  <CardTitle>Orthomosaic</CardTitle>
                  <CardDescription>{survey.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div>
                      An orthomosaic is a high-resolution, georeferenced image
                      created by stitching together multiple overlapping aerial
                      photographs.
                    </div>
                    <div>
                      Orthomosaics provide detailed top-down view of an area,
                      free from distortions and perspective errors.
                    </div>

                    {survey.ortho === null ? (
                      <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                        <p className="text-sm text-muted-foreground text-center">
                          Orthomosaic data is not available for this survey.
                        </p>
                      </div>
                    ) : (
                      <Table className="w-full table-auto text-left">
                        <TableBody>
                          <TableRow>
                            <TableCell>Area</TableCell>
                            <TableCell>
                              {survey.area?.toFixed(2) || "N/A"} ha
                            </TableCell>
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
                    )}
                  </div>
                </CardContent>
                {safeDetectedObjects.length > 0 && (
                  <>
                    <CardHeader>
                      <CardTitle>Plant Disease Detection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-4">
                        <div>
                          Banana plant diseases pose significant threats to the
                          country&apos;s banana industry and severely affects
                          production.
                        </div>
                        <div>
                          Timely detection allows for prompt intervention,
                          minimizing damage and ensuring healthier crops.
                        </div>
                        <FoiSelector detectedObjects={safeDetectedObjects} />
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="3d">
              <Card className="container/card flex flex-1 flex-col gap-4 lg:h-full">
                <CardHeader>
                  <CardTitle>3D Model</CardTitle>
                  <CardDescription>{survey.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div>
                      A 3D model is a digital representation of an object or
                      scene in three dimensions. It captures the shape,
                      dimensions, and sometimes even the surface properties
                      (i.e., color, texture, etc.) of a real world space and/or
                      object.
                    </div>
                    {survey.code && (
                      <ThreeDimensionalModelSelector code={survey.code} />
                    )}
                  </div>
                </CardContent>
                {survey.point_cloud === null ? (
                  <CardContent>
                    <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                      <p className="text-sm text-muted-foreground text-center">
                        3D point cloud data is not available for this survey.
                      </p>
                    </div>
                  </CardContent>
                ) : survey.point_cloud ? (
                  <ThreeDimensionalModelCard pcd={survey.point_cloud} />
                ) : null}
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
