"use client";

import {
  calculateGlobalCenters,
  findExtremeCoordinates,
  getUniqueYears,
  transformCoordinatesToLonLatFormat,
} from "@/lib/helpers";
import {
  Layer,
  Map,
  MapMouseEvent,
  MapProvider,
  Popup,
  Source,
  useMap,
} from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion, AnimatePresence } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateFeatureCollection } from "@/lib/helpers/geometry";
import { GeometryType, type ComputerVisionObject } from "@/lib/types";
import { useOrthoMapStore } from "@/providers/ortho-map-store-provider";
import { getYear } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ============================================================================
// CONSTANTS
// ============================================================================

const PIN_ANIMATION_STYLES = `
  @keyframes dropPin {
    0% { opacity: 0; transform: translateY(-30px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .pin-drop { animation: dropPin 0.6s ease-out forwards; }
`;

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

const DEFAULT_ZOOM_LEVELS = { heatmapMaxZoom: 15, pinMinZoom: 15 };

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateOptimalZoomLevels(features: any[]) {
  if (!features?.length) return DEFAULT_ZOOM_LEVELS;

  const coords = features
    .filter((f) => f.geometry?.coordinates)
    .map((f) => f.geometry.coordinates);

  if (!coords.length) return DEFAULT_ZOOM_LEVELS;

  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const lonSpan = Math.max(...lons) - Math.min(...lons);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const avgSpan = (lonSpan + latSpan) / 2;

  let zoomThreshold = 15;
  if (avgSpan > 0.1) zoomThreshold = 17;
  else if (avgSpan > 0.01) zoomThreshold = 16;
  else if (avgSpan > 0.001) zoomThreshold = 18;
  else zoomThreshold = 19;

  const density = features.length / (avgSpan * avgSpan || 1);
  if (density > 1000) zoomThreshold = Math.min(19, zoomThreshold + 1);
  else if (density < 10) zoomThreshold = Math.max(13, zoomThreshold - 2);

  return { heatmapMaxZoom: zoomThreshold, pinMinZoom: zoomThreshold };
}

function calculateCentroid(coordinates: number[][][]) {
  const points = coordinates[0];
  const sum = points.reduce(
    (acc, point) => ({ x: acc.x + point[0], y: acc.y + point[1] }),
    { x: 0, y: 0 }
  );
  return [sum.x / points.length, sum.y / points.length];
}

// ============================================================================
// MAP COMPONENTS
// ============================================================================

function MapEvents({ surveys, showBoundaries }) {
  const { orthomap } = useMap();
  const { setPopupInfo } = useOrthoMapStore((state) => state);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!showBoundaries || !surveys || !e.features?.length) return;

      const surveyId = e.features[0]?.properties.survey_id;
      const clickedSurvey = surveys.find((s) => s.id === surveyId);

      if (clickedSurvey) {
        const coordinates = [
          transformCoordinatesToLonLatFormat(clickedSurvey.boundaries),
        ];
        const [lng, lat] = calculateCentroid(coordinates);

        setPopupInfo({ ...clickedSurvey, lat, lng });

        orthomap?.flyTo({
          center: [lng, lat],
          zoom: Math.max(orthomap.getZoom(), 16),
          padding: { top: 250, bottom: 25, left: 50, right: 50 },
          duration: 800,
          curve: 1.4,
          essential: true,
        });
      }
    },
    [surveys, setPopupInfo, orthomap, showBoundaries]
  );

  useEffect(() => {
    if (!orthomap) return;
    orthomap.on("click", "area-fills", handleMapClick);
    return () => orthomap.off("click", "area-fills", handleMapClick);
  }, [orthomap, handleMapClick]);

  return null;
}

function InitializeMapImages() {
  const { orthomap } = useMap();

  useEffect(() => {
    if (!orthomap) return;

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
          if (!orthomap.hasImage(id)) orthomap.addImage(id, imageData);
        } catch (error) {
          console.warn(`Failed to add image ${id}:`, error);
        }
      };
      img.onerror = () => console.error(`Failed to load SVG image for ${id}`);
      img.src = `data:image/svg+xml;base64,${btoa(svgString)}`;
    };

    loadSvgImage(PIN_IMAGES.yellow, "pin-yellow");
    loadSvgImage(PIN_IMAGES.red, "pin-red");
  }, [orthomap]);

  return null;
}

function MapLegend({ selectedFoi }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!selectedFoi || selectedFoi === "none") return null;

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
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full border-2 border-white shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  Healthy Plants
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  No signs of disease detected
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 group">
              <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-2 border-white shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  Infected Plants
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Disease or pest detected
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
              <span>Zoom in to see individual plant markers</span>
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

function MapPopup() {
  const { popupInfo, setPopupInfo } = useOrthoMapStore((state) => state);

  if (!popupInfo) return null;

  return (
    <AnimatePresence mode="wait">
      <Popup
        key={popupInfo.id}
        anchor="bottom"
        longitude={popupInfo.lng}
        latitude={popupInfo.lat}
        onClose={() => setPopupInfo(null)}
        closeOnClick={false}
        closeOnMove={false}
        maxWidth="none"
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ duration: 0.23, ease: "easeOut" }}
          className="rounded-xl overflow-hidden shadow-xl border border-border bg-card w-full max-w-[340px]"
        >
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="bg-primary px-4 py-3.5 border-b"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-wider text-primary-foreground/70 font-medium mb-1">
                  Survey Area
                </div>
                <div className="text-lg font-semibold text-primary-foreground">
                  {`${popupInfo.access_code}-${popupInfo.area_code}`}
                </div>
              </div>
              <div className="text-xs px-2.5 py-1 bg-primary-foreground/20 text-primary-foreground rounded-md font-medium">
                #{popupInfo.id}
              </div>
            </div>
          </motion.div>

          <div className="bg-card px-4 py-3.5 space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.11 }}
            >
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Area
                  </span>
                </div>
                <span className="text-base font-bold text-foreground">
                  {popupInfo.area.toFixed(2)} ha
                </span>
              </div>
            </motion.div>

            {(popupInfo.flight_date ||
              popupInfo.location ||
              popupInfo.tags) && (
              <>
                <Separator />
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-2"
                >
                  {popupInfo.flight_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Flight date
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {new Date(popupInfo.flight_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {popupInfo.location && (
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        Location
                      </span>
                      <span
                        className="text-sm font-semibold text-foreground truncate max-w-[180px]"
                        title={popupInfo.location}
                      >
                        {popupInfo.location}
                      </span>
                    </div>
                  )}
                  {popupInfo.tags && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Type
                      </span>
                      <span className="text-xs font-semibold text-foreground uppercase px-2 py-0.5 bg-muted rounded">
                        {popupInfo.tags}
                      </span>
                    </div>
                  )}
                </motion.div>
              </>
            )}

            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="pt-1"
            >
              <Link href={`/dashboard/surveys/${popupInfo.id}`}>
                <button className="w-full px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold shadow-sm">
                  View Details →
                </button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </Popup>
    </AnimatePresence>
  );
}

function SourceLoadingStatus({ idList }: { idList: string[] }) {
  const { areAllSourcesLoaded, setAreAllSourcesLoaded } = useOrthoMapStore(
    (state) => state
  );
  const { orthomap } = useMap();

  useEffect(() => {
    if (!orthomap) return;

    const handleIdle = () => setAreAllSourcesLoaded(true);
    orthomap.on("idle", handleIdle);

    return () => orthomap.off("idle", handleIdle);
  }, [orthomap, setAreAllSourcesLoaded]);

  return (
    <div className="text-sm text-muted-foreground">
      {areAllSourcesLoaded ? "All sources loaded." : "Loading map sources..."}
    </div>
  );
}

function OrthomapFoiSelector({
  detectedObjects,
}: {
  detectedObjects: ComputerVisionObject[];
}) {
  const { selectedFoi, setSelectedFoi } = useOrthoMapStore((state) => state);
  const [placeholder, setPlaceholder] = useState("feature of interest");

  useEffect(() => {
    const updatePlaceholder = () =>
      setPlaceholder(window.innerWidth < 768 ? "FOI" : "feature of interest");
    updatePlaceholder();
    window.addEventListener("resize", updatePlaceholder);
    return () => window.removeEventListener("resize", updatePlaceholder);
  }, []);

  const counts = useMemo(() => {
    if (!detectedObjects || !Array.isArray(detectedObjects))
      return { healthy: 0, unhealthy: 0 };
    return {
      healthy: detectedObjects.filter(
        (obj) => obj.label === "Banana Plant (Healthy-looking)"
      ).length,
      unhealthy: detectedObjects.filter(
        (obj) => obj.label === "Banana Plant (Infected)"
      ).length,
    };
  }, [detectedObjects]);

  return (
    <Select value={selectedFoi} onValueChange={setSelectedFoi}>
      <SelectTrigger className="w-fit" id="foi-selector">
        <Label>Crop Status:</Label>
        <SelectValue placeholder={`Select ${placeholder}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Feature of Interest</SelectLabel>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="healthy">
            Healthy Banana
            {selectedFoi === "healthy" && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {counts.healthy}
              </Badge>
            )}
          </SelectItem>
          <SelectItem value="unhealthy">
            Unhealthy Banana
            {selectedFoi === "unhealthy" && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {counts.unhealthy}
              </Badge>
            )}
          </SelectItem>
          <SelectItem value="all">
            All
            {selectedFoi === "all" && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {counts.healthy + counts.unhealthy}
              </Badge>
            )}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function FeaturesOfInterest({
  code,
  detectedObjects,
}: {
  code: string;
  detectedObjects: ComputerVisionObject[];
}) {
  const { selectedFoi } = useOrthoMapStore((state) => state);

  const { healthyBananas, unhealthyBananas } = useMemo(() => {
    if (!detectedObjects || !Array.isArray(detectedObjects))
      return { healthyBananas: "", unhealthyBananas: "" };
    return {
      healthyBananas: generateFeatureCollection(
        GeometryType.Point,
        "Banana Plant (Healthy-looking)",
        detectedObjects
      ),
      unhealthyBananas: generateFeatureCollection(
        GeometryType.Point,
        "Banana Plant (Infected)",
        detectedObjects
      ),
    };
  }, [detectedObjects]);

  const healthyZoomLevels = useMemo(() => {
    if (!healthyBananas) return DEFAULT_ZOOM_LEVELS;
    const levels = calculateOptimalZoomLevels(
      (healthyBananas as any).features || []
    );
    return { ...levels, pinMinZoom: Math.max(13, levels.pinMinZoom - 1.5) };
  }, [healthyBananas]);

  const unhealthyZoomLevels = useMemo(() => {
    if (!unhealthyBananas) return DEFAULT_ZOOM_LEVELS;
    const levels = calculateOptimalZoomLevels(
      (unhealthyBananas as any).features || []
    );
    return { ...levels, pinMinZoom: Math.max(13, levels.pinMinZoom - 1.5) };
  }, [unhealthyBananas]);

  const heatmapPaint = (color: string) => ({
    "heatmap-weight": ["interpolate", ["linear"], ["get", "mag"], 0, 0, 6, 1],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      `rgba(${color}, 0)`,
      0.2,
      `rgba(${color}, 0.3)`,
      0.5,
      `rgba(${color}, 0.6)`,
      1,
      `rgba(${color}, 0.9)`,
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
  });

  const pinLayout = (iconImage: string) => ({
    "icon-image": iconImage,
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
  });

  return (
    <>
      {(selectedFoi === "healthy" || selectedFoi === "all") && (
        <>
          <Source id={`${code}-healthy`} type="geojson" data={healthyBananas}>
            <Layer
              id={`${code}-healthy-heatmap`}
              type="heatmap"
              maxzoom={healthyZoomLevels.heatmapMaxZoom}
              paint={heatmapPaint("251, 192, 45")}
            />
          </Source>
          <Source
            id={`${code}-healthy-pins`}
            type="geojson"
            data={healthyBananas}
          >
            <Layer
              id={`${code}-healthy-pin`}
              type="symbol"
              minzoom={healthyZoomLevels.pinMinZoom}
              layout={pinLayout("pin-yellow")}
              paint={{ "icon-opacity": 0.75 }}
            />
          </Source>
        </>
      )}

      {(selectedFoi === "unhealthy" || selectedFoi === "all") && (
        <>
          <Source
            id={`${code}-unhealthy`}
            type="geojson"
            data={unhealthyBananas}
          >
            <Layer
              id={`${code}-unhealthy-heatmap`}
              type="heatmap"
              maxzoom={unhealthyZoomLevels.heatmapMaxZoom}
              paint={heatmapPaint("255, 0, 0")}
            />
          </Source>
          <Source
            id={`${code}-unhealthy-pins`}
            type="geojson"
            data={unhealthyBananas}
          >
            <Layer
              id={`${code}-unhealthy-pin`}
              type="symbol"
              minzoom={unhealthyZoomLevels.pinMinZoom}
              layout={pinLayout("pin-red")}
              paint={{ "icon-opacity": 0.75 }}
            />
          </Source>
        </>
      )}
    </>
  );
}

function BoundaryLayers({ showBoundaries }) {
  const { orthomap } = useMap();

  useEffect(() => {
    if (!orthomap || !showBoundaries) return;

    const moveLayersToTop = () => {
      try {
        if (
          orthomap.getLayer("boundary-glow") &&
          orthomap.getLayer("boundary-borders")
        ) {
          orthomap.moveLayer("boundary-glow");
          orthomap.moveLayer("boundary-borders");
        }
      } catch (e) {
        console.warn("Error moving boundary layers:", e);
      }
    };

    moveLayersToTop();
    orthomap.on("styledata", moveLayersToTop);
    return () => orthomap.off("styledata", moveLayersToTop);
  }, [orthomap, showBoundaries]);

  return (
    <>
      <Layer
        id="boundary-glow"
        type="line"
        source="areas"
        paint={{
          "line-color": "#0ea5e9",
          "line-width": 5,
          "line-blur": 3,
          "line-opacity": 0.4,
        }}
        layout={{ visibility: showBoundaries ? "visible" : "none" }}
      />
      <Layer
        id="boundary-borders"
        type="line"
        source="areas"
        paint={{
          "line-color": "#0ea5e9",
          "line-width": 2.5,
          "line-opacity": 0.9,
        }}
        layout={{ visibility: showBoundaries ? "visible" : "none" }}
      />
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OrthoMap({ userProfile, surveys, detectedObjects }) {
  const [showBoundaries, setShowBoundaries] = useState(false);
  const { selectedFoi, setPopupInfo } = useOrthoMapStore((state) => state);

  // ✅ ADD: Filter out invalid surveys at the start
  const validSurveys = useMemo(() => {
    if (!surveys || !Array.isArray(surveys)) return [];
    return surveys.filter(
      (survey) =>
        survey.geojson_boundaries &&
        survey.boundaries &&
        Array.isArray(survey.geojson_boundaries) &&
        Array.isArray(survey.boundaries)
    );
  }, [surveys]);

  // ✅ ADD: Handle empty surveys
  if (validSurveys.length === 0) {
    return (
      <div className="flex flex-1 flex-col h-full gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <p className="text-sm font-medium">No valid surveys to display</p>
            <p className="text-xs mt-1">
              Surveys need boundary data to show on map
            </p>
          </div>
        </div>
      </div>
    );
  }

  const surveyIds = useMemo(
    () => validSurveys.map((s) => s.id),
    [validSurveys]
  );

  const { global_x, global_y } = useMemo(
    () => calculateGlobalCenters(validSurveys),
    [validSurveys]
  );

  const bounds = useMemo(() => {
    const extremes = findExtremeCoordinates(
      validSurveys.map((s) => s.geojson_boundaries)
    );
    return extremes;
  }, [validSurveys]);

  // Memoize mapStyle to prevent recreation on every render
  const mapStyle = useMemo(
    () => ({
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "&copy; OpenStreetMap Contributors",
        },
        areas: {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: validSurveys.map((survey) => ({
              type: "Feature",
              properties: {
                survey_id: survey.id,
                latitude: Number((survey.max_y + survey.min_y) / 2),
              },
              geometry: {
                type: "Polygon",
                coordinates: [
                  transformCoordinatesToLonLatFormat(survey.boundaries),
                ],
              },
            })),
          },
          generateId: true,
        },
      },
      layers: [
        { id: "osm", type: "raster", source: "osm" },
        {
          id: "area-fills",
          type: "fill",
          source: "areas",
          paint: {
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
          },
        },
      ],
    }),
    [validSurveys]
  );

  // Memoize initialViewState
  const initialViewState = useMemo(
    () => ({
      latitude: global_y,
      longitude: global_x,
      bounds: bounds,
      fitBoundsOptions: { padding: 15 },
    }),
    [global_x, global_y, bounds]
  );

  // Close popup when boundaries are hidden
  useEffect(() => {
    if (!showBoundaries) setPopupInfo(null);
  }, [showBoundaries, setPopupInfo]);

  return (
    <div className="flex flex-1 flex-col h-full gap-4 py-4 md:gap-6 md:py-6">
      <style>{PIN_ANIMATION_STYLES}</style>

      <Tabs
        defaultValue="orthomap"
        className="flex w-full flex-col justify-start gap-6"
      >
        <div className="flex items-center justify-between px-4 lg:px-6">
          <TabsList>
            <TabsTrigger value="orthomap">Orthomap</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <OrthomapFoiSelector detectedObjects={detectedObjects} />
            <Button
              size="sm"
              variant={showBoundaries ? "default" : "outline"}
              onClick={() => setShowBoundaries((v) => !v)}
            >
              {showBoundaries ? "Hide" : "Show"} Boundaries
            </Button>
          </div>
        </div>
      </Tabs>

      <MapProvider>
        <div className="flex flex-1 h-full px-4 lg:px-6">
          <Card className="@container/card flex flex-1 flex-col h-full relative">
            <CardHeader>
              <CardTitle>{userProfile.organization.code}</CardTitle>
              <CardDescription>{userProfile.organization.name}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 relative">
              <div className="h-full flex">
                <Map
                  id="orthomap"
                  initialViewState={initialViewState}
                  minZoom={13}
                  maxZoom={23}
                  mapStyle={mapStyle}
                >
                  <InitializeMapImages />

                  {surveys.map((survey) => (
                    <Source
                      key={survey.id}
                      id={survey.id}
                      type="raster"
                      tiles={[
                        `/asimov-hawks/tiles/${survey.code.toLowerCase()}/${getYear(
                          survey.flight_date
                        )}/${survey.id}/ortho/sharp-corners/{z}/{x}/{y}.png`,
                      ]}
                      scheme="tms"
                      tileSize={256}
                      minzoom={10}
                      maxzoom={24}
                    >
                      <Layer
                        id={survey.id}
                        type="raster"
                        source={survey.id}
                        minzoom={10}
                        maxzoom={24}
                      />
                    </Source>
                  ))}

                  <FeaturesOfInterest
                    code={surveys[0].code}
                    detectedObjects={detectedObjects}
                  />
                  <BoundaryLayers showBoundaries={showBoundaries} />
                  <MapEvents
                    surveys={surveys}
                    showBoundaries={showBoundaries}
                  />
                  <MapPopup />
                </Map>
                <MapLegend selectedFoi={selectedFoi} />
              </div>
            </CardContent>
            <CardFooter>
              <SourceLoadingStatus idList={surveyIds} />
            </CardFooter>
          </Card>
        </div>
      </MapProvider>
    </div>
  );
}
