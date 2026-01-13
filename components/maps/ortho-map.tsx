"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  calculateGlobalCenters,
  findExtremeCoordinates,
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
import type { MapProps } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  StyleSpecification,
  GeoJSONSourceSpecification,
} from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Polygon,
} from "geojson";
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
import { calculateOptimalZoomLevels } from "@/lib/helpers/map-zoom";
import { MapLegend } from "@/components/maps/shared/map-legend";

// constants
import { PIN_ANIMATION_STYLES } from "@/lib/constants/map-animation";
import { PIN_IMAGES } from "@/lib/constants/map-icons";
import { MAP_COLORS } from "@/lib/constants/map-colors";
import { createHeatmapPaint } from "@/lib/constants/map-heatmap";
import { createPinLayout } from "@/lib/constants/map-layers";

// ============================================================================
// LOCAL TYPES
// ============================================================================

type SurveyLike = {
  id: string | number;
  code?: string | null;
  flight_date?: string | Date | null;
  boundaries?: unknown[];
  min_y?: number;
  max_y?: number;
  access_code?: string;
  area_code?: string;
  area?: number;
  location?: string;
  tags?: string;
};

type PopupInfo = {
  id: string | number;
  lng: number;
  lat: number;
  access_code?: string;
  area_code?: string;
  area?: number;
  flight_date?: string | Date;
  location?: string;
  tags?: string;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateCentroid(coordinates: number[][][]) {
  const points = coordinates[0];
  const sum = points.reduce(
    (acc, point) => ({ x: acc.x + point[0], y: acc.y + point[1] }),
    { x: 0, y: 0 }
  );
  return [sum.x / points.length, sum.y / points.length] as const;
}

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

// ============================================================================
// MAP COMPONENTS
// ============================================================================

const MapEvents = React.memo(
  ({
    surveys,
    showBoundaries,
    code,
    detectedObjects,
  }: {
    surveys: SurveyLike[];
    showBoundaries: boolean;
    code?: string;
    detectedObjects: ComputerVisionObject[];
  }) => {
    const { orthomap } = useMap();
    const { setPopupInfo, setHoveredPairId, setPlantPopupInfo } =
      useOrthoMapStore((state) => state);

    const handleMapClick = useCallback(
      (e: MapMouseEvent) => {
        if (!showBoundaries || !surveys || !e.features?.length) return;

        const surveyId = e.features[0]?.properties?.survey_id;
        const clickedSurvey = surveys.find(
          (s) => String(s.id) === String(surveyId)
        );

        if (clickedSurvey && clickedSurvey.boundaries) {
          const coordinates = [
            transformCoordinatesToLonLatFormat(clickedSurvey.boundaries as any),
          ];
          const [lng, lat] = calculateCentroid(coordinates);

          setPopupInfo({ ...(clickedSurvey as any), lat, lng });

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

    const handlePinClick = useCallback(
      (e: MapMouseEvent) => {
        const objectPairId = e.features?.[0]?.properties?.pairId as
          | string
          | undefined;
        if (!objectPairId) return;

        const clickedObject = detectedObjects.find(
          (o) => o.pairId === objectPairId
        );
        if (!clickedObject) return;

        const { pairId, areaPairId: areaId, bbox } = clickedObject;
        const { centerLng, centerLat } = calculateCentersWithOffset(
          bbox.min_lon,
          bbox.max_lon,
          bbox.min_lat,
          bbox.max_lat
        );

        setPlantPopupInfo({ pairId, areaId, centerLng, centerLat });
      },
      [detectedObjects, setPlantPopupInfo]
    );

    const handlePinHover = useCallback(
      (e: MapMouseEvent) => {
        const pairId = e.features?.[0]?.properties?.pairId as
          | string
          | undefined;
        setHoveredPairId(pairId || null);
        if (pairId && orthomap) orthomap.getCanvas().style.cursor = "pointer";
      },
      [orthomap, setHoveredPairId]
    );

    const handlePinLeave = useCallback(() => {
      setHoveredPairId(null);
      if (orthomap) orthomap.getCanvas().style.cursor = "";
    }, [orthomap, setHoveredPairId]);

    useEffect(() => {
      if (!orthomap || !code) return;

      const LAYER_TYPES: Record<string, string[]> = {
        CLICK_BOUNDARIES: ["area-fills"],
        CLICK_PINS: [`${code}-unhealthy-pin`, `${code}-healthy-pin`],
        HOVER_PINS: [`${code}-unhealthy-pin`, `${code}-healthy-pin`],
      };

      LAYER_TYPES.CLICK_BOUNDARIES.forEach((layer) => {
        orthomap.on("click", layer, handleMapClick);
      });

      LAYER_TYPES.CLICK_PINS.forEach((layer) => {
        orthomap.on("click", layer, handlePinClick);
      });

      LAYER_TYPES.HOVER_PINS.forEach((layer) => {
        orthomap.on("mouseenter", layer, handlePinHover);
        orthomap.on("mouseleave", layer, handlePinLeave);
      });

      return () => {
        LAYER_TYPES.CLICK_BOUNDARIES.forEach((layer) => {
          orthomap.off("click", layer, handleMapClick);
        });
        LAYER_TYPES.CLICK_PINS.forEach((layer) => {
          orthomap.off("click", layer, handlePinClick);
        });
        LAYER_TYPES.HOVER_PINS.forEach((layer) => {
          orthomap.off("mouseenter", layer, handlePinHover);
          orthomap.off("mouseleave", layer, handlePinLeave);
        });
      };
    }, [
      orthomap,
      code,
      handleMapClick,
      handlePinClick,
      handlePinHover,
      handlePinLeave,
    ]);

    return null;
  }
);

MapEvents.displayName = "MapEvents";

const InitializeMapImages = React.memo(() => {
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
        } finally {
          if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
        }
      };

      img.onerror = (e) => {
        console.error(`Failed to load SVG image for ${id}`, e);
        if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
      };

      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      img.src = URL.createObjectURL(blob);
    };

    loadSvgImage(PIN_IMAGES.yellow, "pin-yellow");
    loadSvgImage(PIN_IMAGES.red, "pin-red");
  }, [orthomap]);

  return null;
});

InitializeMapImages.displayName = "InitializeMapImages";

const MapPopup = React.memo(() => {
  const { popupInfo, setPopupInfo } = useOrthoMapStore((state) => state);

  const info = popupInfo as PopupInfo | null;
  if (!info) return null;

  return (
    <AnimatePresence mode="wait">
      <Popup
        key={info.id}
        anchor="bottom"
        longitude={info.lng}
        latitude={info.lat}
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
          className="rounded-xl overflow-hidden shadow-xl border border-border bg-card w-full max-w-85"
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
                  {`${info.access_code ?? ""}-${info.area_code ?? ""}`}
                </div>
              </div>
              <div className="text-xs px-2.5 py-1 bg-primary-foreground/20 text-primary-foreground rounded-md font-medium">
                #{info.id}
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
                  {Number(info.area ?? 0).toFixed(2)} ha
                </span>
              </div>
            </motion.div>

            {(info.flight_date || info.location || info.tags) && (
              <>
                <Separator />
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-2"
                >
                  {info.flight_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Flight date
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {new Date(info.flight_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {info.location && (
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        Location
                      </span>
                      <span
                        className="text-sm font-semibold text-foreground truncate max-w-[180px]"
                        title={info.location}
                      >
                        {info.location}
                      </span>
                    </div>
                  )}
                  {info.tags && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Type
                      </span>
                      <span className="text-xs font-semibold text-foreground uppercase px-2 py-0.5 bg-muted rounded">
                        {info.tags}
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
              <Link href={`/dashboard/surveys/${info.id}`}>
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
});

MapPopup.displayName = "MapPopup";

const PlantPopup = React.memo(() => {
  const { plantPopupInfo, setPlantPopupInfo } = useOrthoMapStore(
    (state) => state
  );

  if (!plantPopupInfo) return null;

  const { centerLng, centerLat } = plantPopupInfo;

  return (
    <Popup
      anchor="bottom"
      longitude={centerLng}
      latitude={centerLat}
      onClose={() => setPlantPopupInfo(null)}
      closeOnClick={false}
    >
      <div className="flex flex-col w-fit gap-1">
        <div className="font-semibold">Plant Information</div>
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
});

PlantPopup.displayName = "PlantPopup";

const SourceLoadingStatus = React.memo(
  ({ idList }: { idList: Array<string | number> }) => {
    const { areAllSourcesLoaded, setAreAllSourcesLoaded } = useOrthoMapStore(
      (state) => state
    );
    const { orthomap } = useMap();

    useEffect(() => {
      if (!orthomap) return;

      const handleIdle = () => setAreAllSourcesLoaded(true);
      orthomap.on("idle", handleIdle);

      return () => {
        orthomap.off("idle", handleIdle);
      };
    }, [orthomap, setAreAllSourcesLoaded]);

    return (
      <div className="text-sm text-muted-foreground">
        {areAllSourcesLoaded ? "All sources loaded." : "Loading map sources..."}
      </div>
    );
  }
);

SourceLoadingStatus.displayName = "SourceLoadingStatus";

const OrthomapFoiSelector = React.memo(
  ({ detectedObjects }: { detectedObjects: ComputerVisionObject[] }) => {
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
);

OrthomapFoiSelector.displayName = "OrthomapFoiSelector";

const RasterTiles = React.memo(({ surveys }: { surveys: SurveyLike[] }) => {
  const surveyTiles = useMemo(() => {
    return surveys
      .filter((survey) => survey.code && survey.flight_date)
      .map((survey) => ({
        id: survey.id,
        code: String(survey.code).toLowerCase(),
        year: getYear(new Date(survey.flight_date as any)),
        tileUrl: `/asimov-hawks/tiles/${String(
          survey.code
        ).toLowerCase()}/${getYear(new Date(survey.flight_date as any))}/${
          survey.id
        }/ortho/sharp-corners/{z}/{x}/{y}.png`,
      }));
  }, [surveys]);

  return (
    <>
      {surveyTiles.map((tile) => (
        <Source
          key={tile.id}
          id={String(tile.id)}
          type="raster"
          tiles={[tile.tileUrl]}
          scheme="tms"
          tileSize={256}
          minzoom={10}
          maxzoom={24}
          // PERFORMANCE: Increase tile cache to reduce reloading
          maxzoom={24}
        >
          <Layer
            id={String(tile.id)}
            type="raster"
            source={String(tile.id)}
            minzoom={10}
            maxzoom={24}
            paint={{
              // PERFORMANCE: Fade in tiles faster for snappier feel
              "raster-fade-duration": 150, // Default is 300ms
              // Optional: Reduce resampling for sharper tiles at non-integer zooms
              "raster-resampling": "nearest", // or "linear" for smoother
            }}
          />
        </Source>
      ))}
    </>
  );
});

RasterTiles.displayName = "RasterTiles";

// FIXED: Memoized FeaturesOfInterest component with proper layer ordering
const FeaturesOfInterest = React.memo(
  ({
    code,
    detectedObjects,
  }: {
    code: string;
    detectedObjects: ComputerVisionObject[];
  }) => {
    const { selectedFoi, hoveredPairId, plantPopupInfo } = useOrthoMapStore(
      (state) => state
    );

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

    const selectedPlantBbox = useMemo<FeatureCollection<
      Polygon,
      GeoJsonProperties
    > | null>(() => {
      const selectedId = plantPopupInfo?.pairId || hoveredPairId;
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
    }, [detectedObjects, plantPopupInfo, hoveredPairId]);

    const isHealthy =
      selectedPlantBbox?.features[0]?.properties &&
      String((selectedPlantBbox.features[0].properties as any).label).includes(
        "Healthy"
      );

    const selectedColor = isHealthy
      ? MAP_COLORS.healthy.base
      : MAP_COLORS.unhealthy.base;

    const healthyZoomLevels = useMemo(() => {
      return calculateOptimalZoomLevels((healthyBananas as any).features ?? []);
    }, [healthyBananas]);

    const unhealthyZoomLevels = useMemo(() => {
      return calculateOptimalZoomLevels(
        (unhealthyBananas as any).features ?? []
      );
    }, [unhealthyBananas]);

    // FIXED: Render unhealthy layers AFTER healthy layers to ensure proper stacking order
    // This prevents healthy pins from covering unhealthy pins when "All" is selected
    return (
      <>
        {selectedPlantBbox && (
          <Source
            id={`${code}-selected-bbox`}
            type="geojson"
            data={selectedPlantBbox}
          >
            <Layer
              id={`${code}-selected-bbox-fill`}
              type="fill"
              paint={{ "fill-color": selectedColor, "fill-opacity": 0.15 }}
            />
            <Layer
              id={`${code}-selected-bbox-outline`}
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

        {/* Render healthy layers first (bottom of stack) */}
        {(selectedFoi === "healthy" || selectedFoi === "all") && (
          <>
            <Source
              id={`${code}-healthy`}
              type="geojson"
              data={healthyBananas as any}
            >
              <Layer
                id={`${code}-healthy-heatmap`}
                type="heatmap"
                maxzoom={healthyZoomLevels.heatmapMaxZoom}
                paint={createHeatmapPaint("healthy")}
              />
            </Source>

            <Source
              id={`${code}-healthy-pins`}
              type="geojson"
              data={healthyBananas as any}
            >
              <Layer
                id={`${code}-healthy-pin`}
                type="symbol"
                minzoom={healthyZoomLevels.pinMinZoom}
                layout={createPinLayout("pin-yellow")}
                paint={{ "icon-opacity": 0.9 }}
              />
            </Source>
          </>
        )}

        {/* Render unhealthy layers second (top of stack) */}
        {(selectedFoi === "unhealthy" || selectedFoi === "all") && (
          <>
            <Source
              id={`${code}-unhealthy`}
              type="geojson"
              data={unhealthyBananas as any}
            >
              <Layer
                id={`${code}-unhealthy-heatmap`}
                type="heatmap"
                maxzoom={unhealthyZoomLevels.heatmapMaxZoom}
                paint={createHeatmapPaint("unhealthy")}
              />
            </Source>

            <Source
              id={`${code}-unhealthy-pins`}
              type="geojson"
              data={unhealthyBananas as any}
            >
              <Layer
                id={`${code}-unhealthy-pin`}
                type="symbol"
                minzoom={unhealthyZoomLevels.pinMinZoom}
                layout={createPinLayout("pin-red")}
                paint={{ "icon-opacity": 0.9 }}
              />
            </Source>
          </>
        )}
      </>
    );
  }
);

FeaturesOfInterest.displayName = "FeaturesOfInterest";

const BoundaryLayers = React.memo(
  ({ showBoundaries }: { showBoundaries: boolean }) => {
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
      return () => {
        orthomap.off("styledata", moveLayersToTop);
      };
    }, [orthomap, showBoundaries]);

    return (
      <>
        <Layer
          id="boundary-glow"
          type="line"
          source="areas"
          paint={{
            "line-color": MAP_COLORS.boundary,
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
            "line-color": MAP_COLORS.boundary,
            "line-width": 2.5,
            "line-opacity": 0.9,
          }}
          layout={{ visibility: showBoundaries ? "visible" : "none" }}
        />
      </>
    );
  }
);

BoundaryLayers.displayName = "BoundaryLayers";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OrthoMap({
  userProfile,
  surveys,
  detectedObjects,
}: {
  userProfile: any;
  surveys: SurveyLike[];
  detectedObjects: ComputerVisionObject[] | null | undefined;
}) {
  if (!surveys || !Array.isArray(surveys) || surveys.length === 0) {
    return (
      <div className="flex flex-1 flex-col h-full gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex flex-1 h-full px-4 lg:px-6">
          <Card className="flex flex-1 flex-col h-full items-center justify-center">
            <CardContent className="text-center py-10">
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No Survey Data Available
              </h3>
              <p className="text-sm text-muted-foreground">
                Please add surveys to view the orthomap.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const safeDetectedObjects = useMemo(
    () => detectedObjects ?? [],
    [detectedObjects]
  );

  const [showBoundaries, setShowBoundaries] = useState(false);
  const { selectedFoi, setPopupInfo } = useOrthoMapStore((state) => state);

  const surveyIds = useMemo(() => surveys.map((s) => s.id), [surveys]);

  const { global_x, global_y } = useMemo(
    () =>
      surveys
        ? calculateGlobalCenters(surveys as any)
        : { global_x: 125.58147596772221, global_y: 7.0763840759644 },
    [surveys]
  );

  const bounds = useMemo(() => {
    try {
      const validSurveys = surveys.filter(
        (s) =>
          s.boundaries && Array.isArray(s.boundaries) && s.boundaries.length > 0
      );
      if (validSurveys.length === 0) return undefined;

      const transformedBoundaries = validSurveys
        .map((s) => {
          try {
            return transformCoordinatesToLonLatFormat(s.boundaries as any);
          } catch (error) {
            console.warn(
              `Failed to transform boundaries for survey ${s.id}:`,
              error
            );
            return null;
          }
        })
        .filter((b): b is any => b !== null);

      if (transformedBoundaries.length === 0) return undefined;
      return findExtremeCoordinates(transformedBoundaries as any);
    } catch (error) {
      console.error("Error calculating bounds:", error);
      return undefined;
    }
  }, [surveys]);

  const mapStyle = useMemo<StyleSpecification>(() => {
    const areaFeatures: Feature<Polygon, GeoJsonProperties>[] = surveys
      .filter((survey) => survey.boundaries && Array.isArray(survey.boundaries))
      .map((survey) => {
        const coords = transformCoordinatesToLonLatFormat(
          survey.boundaries as any
        );

        return {
          type: "Feature",
          properties: {
            survey_id: survey.id,
            latitude: Number(((survey.max_y ?? 0) + (survey.min_y ?? 0)) / 2),
            label: `${survey.access_code ?? ""}-${survey.area_code ?? ""}`,
          },
          geometry: {
            type: "Polygon",
            coordinates: [coords],
          },
        };
      });

    const areasData: FeatureCollection<Polygon, GeoJsonProperties> = {
      type: "FeatureCollection",
      features: areaFeatures,
    };

    const labelFeatures: Feature[] = areaFeatures.map((f) => {
      const centroid = calculateCentroid(f.geometry.coordinates as any);
      return {
        type: "Feature",
        properties: {
          survey_id: (f.properties as any)?.survey_id,
          label: (f.properties as any)?.label,
        },
        geometry: {
          type: "Point",
          coordinates: [...centroid] as [number, number],
        },
      };
    });

    const labelsData: FeatureCollection = {
      type: "FeatureCollection",
      features: labelFeatures,
    };

    return {
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
          data: areasData,
          generateId: true,
        } satisfies GeoJSONSourceSpecification,
        "area-labels": {
          type: "geojson",
          data: labelsData,
        } satisfies GeoJSONSourceSpecification,
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
              MAP_COLORS.boundary,
              MAP_COLORS.hover,
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.7,
              0.4,
            ],
          },
        },
        {
          id: "area-labels",
          type: "symbol",
          source: "area-labels",
          layout: {
            "text-field": ["get", "label"],
            "text-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              10,
              16,
              14,
              20,
              18,
            ],
            "text-anchor": "center",
            "text-allow-overlap": true,
            "text-ignore-placement": true,
            visibility: "none",
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": MAP_COLORS.boundary,
            "text-halo-width": 2,
            "text-halo-blur": 1,
          },
        },
      ],
    };
  }, [surveys]);

  const initialViewState = useMemo<MapProps["initialViewState"]>(
    () => ({
      latitude: global_y,
      longitude: global_x,
      bounds: bounds ?? undefined,
      fitBoundsOptions: { padding: 15 },
    }),
    [global_x, global_y, bounds]
  );

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
            <OrthomapFoiSelector detectedObjects={safeDetectedObjects} />
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
              <CardTitle>
                {userProfile?.organization?.code || "Organization"}
              </CardTitle>
              <CardDescription>
                {userProfile?.organization?.name || "Loading..."}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 relative">
              <div className="h-full flex">
                <Map
                  id="orthomap"
                  initialViewState={initialViewState}
                  minZoom={13}
                  maxZoom={23}
                  mapStyle={mapStyle}
                  // PERFORMANCE: Optimize map rendering
                  renderWorldCopies={false} // Disable world duplication
                  maxTileCacheSize={500} // Increase tile cache (default ~50)
                  transformRequest={(url, resourceType) => {
                    // Add cache headers for better browser caching
                    if (
                      resourceType === "Tile" &&
                      url.includes("/asimov-hawks/tiles/")
                    ) {
                      return {
                        url: url,
                        headers: { "Cache-Control": "public, max-age=86400" },
                      };
                    }
                    return { url };
                  }}
                >
                  <InitializeMapImages />

                  {surveys
                    .filter((survey) => survey.code && survey.flight_date)
                    .map((survey) => (
                      <Source
                        key={survey.id}
                        id={String(survey.id)}
                        type="raster"
                        tiles={[
                          `/asimov-hawks/tiles/${String(
                            survey.code
                          ).toLowerCase()}/${getYear(
                            new Date(survey.flight_date as any)
                          )}/${survey.id}/ortho/sharp-corners/{z}/{x}/{y}.png`,
                        ]}
                        scheme="tms"
                        tileSize={256}
                        minzoom={10}
                        maxzoom={24}
                      >
                        <Layer
                          id={String(survey.id)}
                          type="raster"
                          source={String(survey.id)}
                          minzoom={10}
                          maxzoom={24}
                          paint={{
                            "raster-fade-duration": 150,
                            "raster-resampling": "linear",
                          }}
                        />
                      </Source>
                    ))}

                  {surveys.length > 0 && surveys[0].code && (
                    <FeaturesOfInterest
                      code={String(surveys[0].code)}
                      detectedObjects={safeDetectedObjects}
                    />
                  )}

                  <BoundaryLayers showBoundaries={showBoundaries} />

                  <MapEvents
                    surveys={surveys}
                    showBoundaries={showBoundaries}
                    code={
                      surveys[0]?.code ? String(surveys[0].code) : undefined
                    }
                    detectedObjects={safeDetectedObjects}
                  />

                  <MapPopup />
                  <PlantPopup />
                </Map>

                {selectedFoi && selectedFoi !== "none" && (
                  <MapLegend selectedFoi={selectedFoi} />
                )}
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
