"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ALL_SURVEYS, getSurveyChoices, getSurveySelectionData, getSurveyLabel, getSurveyTileUrl, sortSurveysById, orderSurveyLayers } from "@/lib/helpers/survey-selection";
import { SurveyChoicePopup, type SurveyChoiceLocation } from "./shared/survey-choice-popup";
import { SurveyDetailsPopup } from "./shared/survey-details-popup";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Check, Layers, LoaderCircle, Scan, Info } from "lucide-react";
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
import type { StyleSpecification } from "maplibre-gl";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Polygon,
} from "geojson";
import { motion, AnimatePresence } from "framer-motion";
import { useSurveyModeStore } from "@/stores/survey-mode-store";

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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PlantFilterSelect } from "./shared/plant-filter-select";
import { countPlantDetections, filterPlantDetections, getDetectionKey, getDetectionPlantName, getDetectionPlantType, resolveDetectionFilter } from "@/lib/helpers/detection-labels";
import { InventoryLayers } from "./shared/inventory-layers";
import { InventoryLegend } from "./shared/inventory-legend";
import { generateInventoryFeatureCollection, generateFeatureCollection } from "@/lib/helpers/geometry";
import { GeometryType, type ComputerVisionObject } from "@/lib/types";
import { useOrthoMapStore } from "@/providers/ortho-map-store-provider";
import { calculateOptimalZoomLevels } from "@/lib/helpers/map-zoom";
import MapLegend from "@/components/maps/shared/map-legend";
import { SurveyModeToggle } from "@/components/maps/shared/survey-mode-toggle";

// constants
import { PIN_ANIMATION_STYLES } from "@/lib/constants/map-animation";
import { PIN_IMAGES } from "@/lib/constants/map-icons";
import { MAP_COLORS } from "@/lib/constants/map-colors";
import { createHeatmapPaint } from "@/lib/constants/map-heatmap";
import { createPinLayout } from "@/lib/constants/map-layers";

const ORTHOMAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256, maxzoom: 19, attribution: "&copy; OpenStreetMap Contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

// ============================================================================
// LOCAL TYPES
// ============================================================================

type SurveyLike = {
  id: string | number;
  code?: string | null;
  flight_date?: string | Date | null;
  ortho?: { tile_folder?: string | null } | null;
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
    { x: 0, y: 0 },
  );
  return [sum.x / points.length, sum.y / points.length] as const;
}

function calculateCentersWithOffset(
  min_lon: number,
  max_lon: number,
  min_lat: number,
  max_lat: number,
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
    isOverview,
    onChooseSurvey,
  }: {
    isOverview: boolean;
    onChooseSurvey: (id: string) => void;
    surveys: SurveyLike[];
    showBoundaries: boolean;
    code?: string;
    detectedObjects: ComputerVisionObject[];
  }) => {
    const { orthomap } = useMap();
    const { setPopupInfo, setHoveredPairId, setPlantPopupInfo } =
      useOrthoMapStore((state) => state);
    const { surveyMode } = useSurveyModeStore();

    const [choice, setChoice] = useState<SurveyChoiceLocation<SurveyLike> | null>(null);
    const openSurveyPopup = useCallback((survey: SurveyLike) => {
      setChoice(null);
      setPlantPopupInfo(null);
      if (!survey.boundaries?.length) return;
      const [lng, lat] = calculateCentroid([
        transformCoordinatesToLonLatFormat(survey.boundaries as any),
      ]);
      setPopupInfo({ ...survey, lat, lng });
      orthomap?.easeTo({
        center: [lng, lat], zoom: Math.max(orthomap.getZoom(), 16),
        offset: [0, 80], duration: 600,
      });
    }, [orthomap, setPopupInfo, setPlantPopupInfo]);

    const chooseSurvey = useCallback((survey: SurveyLike) => {
      setChoice(null);
      if (isOverview) onChooseSurvey(String(survey.id));
      else openSurveyPopup(survey);
    }, [isOverview, onChooseSurvey, openSurveyPopup]);

    const handleMapClick = useCallback((event: MapMouseEvent) => {
      if (!orthomap) return;
      const pinLayers = (surveyMode === "inventory"
        ? [`${code}-inventory-pin`] : [`${code}-healthy-pin`, `${code}-unhealthy-pin`])
        .filter((id) => orthomap.getLayer(id));
      if (pinLayers.length && orthomap.queryRenderedFeatures(event.point, { layers: pinLayers }).length) return;
      setPopupInfo(null);
      setChoice(null);
      if (!showBoundaries || !orthomap.getLayer("area-fills")) return;
      const candidates = getSurveyChoices(
        orthomap.queryRenderedFeatures(event.point, { layers: ["area-fills"] }), surveys,
      );
      if (candidates.length === 1) openSurveyPopup(candidates[0]);
      else if (candidates.length > 1) setChoice({
        longitude: event.lngLat.lng, latitude: event.lngLat.lat, surveys: candidates,
      });
    }, [orthomap, surveyMode, code, showBoundaries, surveys, openSurveyPopup, setPopupInfo]);

    useEffect(() => { setChoice(null); }, [surveys, showBoundaries]);

    const handlePinClick = useCallback(
      (e: MapMouseEvent) => {
        const objectPairId = e.features?.[0]?.properties?.pairId as
          | string
          | undefined;
        if (!objectPairId) return;

        const clickedObject = detectedObjects.find(
          (o) => o.pairId === objectPairId && (!e.features?.[0]?.properties?.areaCode || o.areaCode === e.features[0].properties.areaCode),
        );
        if (!clickedObject) return;

        const { pairId, areaPairId: areaId, bbox, label } = clickedObject;
        const { centerLng, centerLat } = calculateCentersWithOffset(
          bbox.min_lon,
          bbox.max_lon,
          bbox.min_lat,
          bbox.max_lat,
        );

        setPopupInfo(null);
        setChoice(null);
        setPlantPopupInfo({ pairId, areaId, areaCode: clickedObject.areaCode, centerLng, centerLat, label });
      },
      [detectedObjects, setPlantPopupInfo, setPopupInfo],
    );

    const handlePinHover = useCallback(
      (e: MapMouseEvent) => {
        const pairId = (e.features?.[0]?.properties?.detectionKey ?? e.features?.[0]?.properties?.pairId) as
          | string
          | undefined;
        setHoveredPairId(pairId || null);
        if (pairId && orthomap) orthomap.getCanvas().style.cursor = "pointer";
      },
      [orthomap, setHoveredPairId],
    );

    const handlePinLeave = useCallback(() => {
      setHoveredPairId(null);
      if (orthomap) orthomap.getCanvas().style.cursor = "";
    }, [orthomap, setHoveredPairId]);

    useEffect(() => {
      if (!orthomap || !code) return;

      const pinLayers =
        surveyMode === "inventory"
          ? [`${code}-inventory-pin`]
          : [`${code}-unhealthy-pin`, `${code}-healthy-pin`];

      orthomap.on("click", handleMapClick);
      pinLayers.forEach((layer) => orthomap.on("click", layer, handlePinClick));
      pinLayers.forEach((layer) => {
        orthomap.on("mouseenter", layer, handlePinHover);
        orthomap.on("mouseleave", layer, handlePinLeave);
      });

      return () => {
        orthomap.off("click", handleMapClick);
        pinLayers.forEach((layer) =>
          orthomap.off("click", layer, handlePinClick),
        );
        pinLayers.forEach((layer) => {
          orthomap.off("mouseenter", layer, handlePinHover);
          orthomap.off("mouseleave", layer, handlePinLeave);
        });
      };
    }, [
      orthomap,
      code,
      surveyMode,
      handleMapClick,
      handlePinClick,
      handlePinHover,
      handlePinLeave,
    ]);

    return choice ? <SurveyChoicePopup choice={choice} onChoose={chooseSurvey}
      onClose={() => setChoice(null)} /> : null;
  },
);

MapEvents.displayName = "MapEvents";

// Keep the map mounted while fitting and ordering newly selected sources.
const ActiveSurveyView = React.memo(({ bounds, rasterIds }: {
  bounds: any;
  rasterIds: string[];
}) => {
  const { orthomap } = useMap();
  const sourceKey = rasterIds.join("|");
  useEffect(() => {
    if (orthomap && bounds) {
      // Popup positioning must not reduce the space available to the next survey.
      orthomap.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
      orthomap.fitBounds(bounds, {
        padding: 24, duration: 600, maxZoom: 20, linear: true,
      });
    }
  }, [orthomap, bounds]);

  useEffect(() => {
    if (!orthomap) return;
    let ordering = false;
    const order = () => {
      if (ordering || !orthomap.getLayer("area-fills")) return;
      ordering = true;
      try { orderSurveyLayers(orthomap, rasterIds); }
      finally { ordering = false; }
    };
    order();
    orthomap.on("styledata", order);
    return () => { orthomap.off("styledata", order); };
  }, [orthomap, sourceKey]);
  return null;
});
ActiveSurveyView.displayName = "ActiveSurveyView";

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
    loadSvgImage(PIN_IMAGES.gray, "pin-gray");
    loadSvgImage(PIN_IMAGES.coconut, "pin-coconut");
  }, [orthomap]);

  return null;
});

InitializeMapImages.displayName = "InitializeMapImages";

const MapPopup = React.memo(() => {
  const { popupInfo, setPopupInfo } = useOrthoMapStore((state) => state);

  const info = popupInfo as PopupInfo | null;
  if (!info) return null;

  return (
    <SurveyDetailsPopup survey={info} longitude={info.lng} latitude={info.lat}
      onClose={() => setPopupInfo(null)} />
  );
});

MapPopup.displayName = "MapPopup";

const PlantPopup = React.memo(() => {
  const { plantPopupInfo, setPlantPopupInfo } = useOrthoMapStore(
    (state) => state,
  );
  const { surveyMode } = useSurveyModeStore(); // ← add

  if (!plantPopupInfo) return null;

  const { centerLng, centerLat, label } = plantPopupInfo; // ← destructure label
  const isHealthy = String(label ?? "").includes("Healthy");

  return (
    <Popup
      anchor="bottom"
      longitude={centerLng}
      latitude={centerLat}
      onClose={() => setPlantPopupInfo(null)}
      closeOnClick={false}
    >
      <div className="flex flex-col w-fit gap-1 min-w-40">
        <div className="font-semibold">Plant Information</div>
        <Separator />
        <div className="flex flex-col gap-1">
          {label && (
            <div className="grid grid-cols-2 gap-2">
              <span>{surveyMode === "inventory" ? "Plant type:" : "Status:"}</span>
              <span
                className={
                  surveyMode === "inventory"
                    ? "text-muted-foreground"
                    : isHealthy
                      ? "text-green-600 font-medium"
                      : "text-red-600 font-medium"
                }
              >
                {surveyMode === "inventory"
                  ? getDetectionPlantName(label)
                  : isHealthy
                    ? "Healthy"
                    : "Infected"}
              </span>
            </div>
          )}
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
  ({ idList }: { idList: string[] }) => {
    const { orthomap } = useMap();
    const [status, setStatus] = useState<"loading" | "loaded" | "error" | "empty">("loading");
    const sourceKey = idList.join("|");

    useEffect(() => {
      if (!orthomap) return;
      let failed = false;
      setStatus(idList.length ? "loading" : "empty");
      const update = () => {
        if (!idList.length) return setStatus("empty");
        if (failed) return setStatus("error");
        const loaded = idList.every((id) => orthomap.getSource(id) && orthomap.isSourceLoaded(id));
        setStatus(loaded ? "loaded" : "loading");
      };
      const error = (event: { sourceId?: string }) => {
        if (event.sourceId && idList.includes(event.sourceId)) {
          failed = true;
          setStatus("error");
        }
      };
      orthomap.on("sourcedata", update);
      orthomap.on("idle", update);
      orthomap.on("error", error);
      update();
      return () => {
        orthomap.off("sourcedata", update);
        orthomap.off("idle", update);
        orthomap.off("error", error);
      };
    }, [orthomap, sourceKey]);

    const Icon = status === "loading" ? LoaderCircle : status === "loaded" ? Check
      : status === "error" ? AlertCircle : Info;
    return <div role="status" aria-live="polite"
      className={`flex items-center gap-1.5 text-xs ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
      <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${status === "loading" ? "animate-spin motion-reduce:animate-none" : ""}`} />
      {status === "loaded" ? "Ready" : status === "error" ? "Some imagery unavailable"
        : status === "empty" ? "No imagery" : "Loading imagery…"}
    </div>;
  },
);

SourceLoadingStatus.displayName = "SourceLoadingStatus";

const OrthomapFoiSelector = React.memo(
  ({ detectedObjects }: { detectedObjects: ComputerVisionObject[] }) => {
    const { selectedFoi, setSelectedFoi, setPlantPopupInfo, setHoveredPairId } = useOrthoMapStore(state => state);
    const { surveyMode } = useSurveyModeStore();
    const selection = resolveDetectionFilter(selectedFoi, surveyMode, countPlantDetections(detectedObjects).coconut > 0);
    useEffect(() => {
      if (selection !== selectedFoi) setSelectedFoi(selection);
      setPlantPopupInfo(null);
      setHoveredPairId(null);
    }, [selection, selectedFoi, surveyMode, detectedObjects, setSelectedFoi, setPlantPopupInfo, setHoveredPairId]);
    return <PlantFilterSelect detectedObjects={detectedObjects} mode={surveyMode} value={selection} onValueChange={setSelectedFoi} />;
  },
);

OrthomapFoiSelector.displayName = "OrthomapFoiSelector";

const RasterTiles = React.memo(({ surveys }: { surveys: SurveyLike[] }) => (
  <>
    {surveys.map((survey) => {
      const url = getSurveyTileUrl(survey);
      if (!url) return null;
      return (
        <Source key={survey.id} id={String(survey.id)} type="raster"
          tiles={[url]} scheme="tms" tileSize={256} minzoom={11} maxzoom={24}>
          <Layer id={String(survey.id)} type="raster" source={String(survey.id)}
            beforeId="area-fills" minzoom={11} maxzoom={24}
            paint={{ "raster-fade-duration": 150, "raster-resampling": "linear" }} />
        </Source>
      );
    })}
  </>
));
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
      (state) => state,
    );
    const { surveyMode } = useSurveyModeStore(); // ← add

    const { healthyBananas, unhealthyBananas } = useMemo(() => {
      if (!detectedObjects || !Array.isArray(detectedObjects))
        return { healthyBananas: "", unhealthyBananas: "" };
      return {
        healthyBananas: generateFeatureCollection(
          GeometryType.Point,
          "Banana Plant (Healthy-looking)",
          detectedObjects,
        ),
        unhealthyBananas: generateFeatureCollection(
          GeometryType.Point,
          "Banana Plant (Infected)",
          detectedObjects,
        ),
      };
    }, [detectedObjects]);

    const activeFilter = resolveDetectionFilter(selectedFoi, surveyMode, countPlantDetections(detectedObjects).coconut > 0);
    const activeObjects = useMemo(() => filterPlantDetections(detectedObjects, activeFilter, surveyMode), [detectedObjects, activeFilter, surveyMode]);
    const allBananasFC = useMemo(() => generateInventoryFeatureCollection(detectedObjects, activeFilter), [detectedObjects, activeFilter]);

    const selectedPlantBbox = useMemo<FeatureCollection<
      Polygon,
      GeoJsonProperties
    > | null>(() => {
      const selectedId = plantPopupInfo?.pairId || hoveredPairId;
      if (!selectedId) return null;

      const selectedObject = activeObjects.find(
        (obj) => getDetectionKey(obj) === selectedId || (obj.pairId === selectedId && (!plantPopupInfo?.areaCode || obj.areaCode === plantPopupInfo.areaCode)),
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
    }, [activeObjects, plantPopupInfo, hoveredPairId]);

    const isHealthy =
      selectedPlantBbox?.features[0]?.properties &&
      String((selectedPlantBbox.features[0].properties as any).label).includes(
        "Healthy",
      );

    // Inventory highlights identify the species, rather than its health.
    const selectedColor =
      surveyMode === "inventory"
        ? getDetectionPlantType(selectedPlantBbox?.features[0]?.properties?.label) === "coconut" ? MAP_COLORS.coconut.base : MAP_COLORS.inventory.base
        : isHealthy
          ? MAP_COLORS.healthy.base
          : MAP_COLORS.unhealthy.base;

    const healthyZoomLevels = useMemo(
      () => calculateOptimalZoomLevels((healthyBananas as any).features ?? []),
      [healthyBananas],
    );

    const unhealthyZoomLevels = useMemo(
      () =>
        calculateOptimalZoomLevels((unhealthyBananas as any).features ?? []),
      [unhealthyBananas],
    );

    const allZoomLevels = useMemo(
      () => calculateOptimalZoomLevels(allBananasFC.features as any),
      [allBananasFC],
    );

    // ── INVENTORY MODE ────────────────────────────────────────────────────────
    if (surveyMode === "inventory") {
      const showInventoryPins = selectedFoi !== "none" && selectedFoi !== "";
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
          {showInventoryPins && (
            <>
              <InventoryLayers id={code} data={allBananasFC as FeatureCollection<any>} zoomLevels={allZoomLevels} />
            </>
          )}
        </>
      );
    }

    // ── ANALYSIS MODE (existing behavior) ─────────────────────────────────────
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

        {(activeFilter === "healthy" || activeFilter === "all") && (
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

        {(activeFilter === "unhealthy" || activeFilter === "all") && (
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
  },
);

FeaturesOfInterest.displayName = "FeaturesOfInterest";

const BoundaryLayers = React.memo(
  ({ showBoundaries }: { showBoundaries: boolean }) => {
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
  },
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

  return <OrthoMapContent userProfile={userProfile} surveys={surveys} detectedObjects={detectedObjects} />;
}

function OrthoMapContent({ userProfile, surveys: availableSurveys, detectedObjects }: {
  userProfile: any;
  surveys: SurveyLike[];
  detectedObjects: ComputerVisionObject[] | null | undefined;
}) {
  const orderedSurveys = useMemo(() => sortSurveysById(availableSurveys), [availableSurveys]);
  const [requestedId, setRequestedId] = useState(() => String(orderedSurveys[0].id));
  const selectionData = useMemo(
    () => getSurveySelectionData(orderedSurveys, detectedObjects ?? [], requestedId),
    [orderedSurveys, detectedObjects, requestedId],
  );
  const { selection: activeSurveyId, surveys, detectedObjects: safeDetectedObjects } = selectionData;
  const isOverview = activeSurveyId === ALL_SURVEYS;
  const [showBoundaries, setShowBoundaries] = useState(false);
  const { selectedFoi, setPopupInfo, setPlantPopupInfo, setHoveredPairId } = useOrthoMapStore((state) => state);
  const selectSurvey = useCallback((id: string) => {
    setPopupInfo(null);
    setPlantPopupInfo(null);
    setHoveredPairId(null);
    setRequestedId(id);
  }, [setPopupInfo, setPlantPopupInfo, setHoveredPairId]);

  useEffect(() => {
    setRequestedId(activeSurveyId);
    setPopupInfo(null);
    setPlantPopupInfo(null);
    setHoveredPairId(null);
  }, [activeSurveyId, setPopupInfo, setPlantPopupInfo, setHoveredPairId]);

  const surveyIds = useMemo(
    () => surveys.filter((survey) => getSurveyTileUrl(survey)).map((survey) => String(survey.id)),
    [surveys],
  );

  const { global_x, global_y } = useMemo(
    () =>
      surveys
        ? calculateGlobalCenters(surveys as any)
        : { global_x: 125.58147596772221, global_y: 7.0763840759644 },
    [surveys],
  );

  const bounds = useMemo(() => {
    try {
      const validSurveys = surveys.filter(
        (s) =>
          s.boundaries &&
          Array.isArray(s.boundaries) &&
          s.boundaries.length > 0,
      );
      if (validSurveys.length === 0) return undefined;

      const transformedBoundaries = validSurveys
        .map((s) => {
          try {
            return transformCoordinatesToLonLatFormat(s.boundaries as any);
          } catch (error) {
            console.warn(
              `Failed to transform boundaries for survey ${s.id}:`,
              error,
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

  const boundaryData = useMemo(() => {
    const areaFeatures: Feature<Polygon, GeoJsonProperties>[] = surveys
      .filter((survey) => survey.boundaries && Array.isArray(survey.boundaries))
      .map((survey) => {
        const coords = transformCoordinatesToLonLatFormat(
          survey.boundaries as any,
        );

        return {
          type: "Feature",
          properties: {
            survey_id: survey.id,
            latitude: Number(((survey.max_y ?? 0) + (survey.min_y ?? 0)) / 2),
            label: `${survey.id} · ${getSurveyLabel(survey)}`,
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

    return { areas: areasData, labels: labelsData };
  }, [surveys]);

  const initialViewState = useMemo<MapProps["initialViewState"]>(
    () => ({
      latitude: global_y,
      longitude: global_x,
      bounds: bounds ?? undefined,
      fitBoundsOptions: { padding: 24, maxZoom: 20 },
    }),
    [global_x, global_y, bounds],
  );
  const { surveyMode } = useSurveyModeStore();

  useEffect(() => {
    if (!showBoundaries) setPopupInfo(null);
  }, [showBoundaries, setPopupInfo]);

  return (
    <div className="flex flex-1 flex-col h-full gap-4 py-4 md:gap-6 md:py-6">
      <style>{PIN_ANIMATION_STYLES}</style>

      <MapProvider>
        <div className="flex min-w-0 flex-1 px-4 lg:px-6">
          <Card className="@container/card relative flex min-w-0 flex-1 flex-col gap-3 py-4">
            <CardHeader className="gap-3 px-4 sm:px-5">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base leading-6">Orthomap</CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    {[userProfile?.organization?.code, userProfile?.organization?.name].filter(Boolean).join(" · ") || "Organization"}
                  </CardDescription>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs" aria-live="polite">
                  <span className="text-muted-foreground">Viewing:</span>
                  {isOverview ? (
                    <>
                      <Badge variant="secondary" className="rounded-md font-normal">All surveys</Badge>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="h-11 sm:h-8" aria-label={`Survey images (${surveyIds.length})`}>
                            <Layers aria-hidden="true" className="size-3.5" /> Survey images ({surveyIds.length})
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" collisionPadding={16} className="w-80 max-w-[calc(100vw-32px)] p-3" aria-label="Survey images">
                          <h3 className="text-sm font-medium">Survey images</h3>
                          <p className="mt-1 text-sm leading-5 text-muted-foreground">These are the survey images shown on the map. They can be side by side or overlap.</p>
                          <p className="mb-2 mt-2 text-sm leading-5 text-muted-foreground">If images overlap, those higher in this list appear in front.</p>
                          <ol className="max-h-60 space-y-1 overflow-y-auto">
                            {[...surveys].reverse().filter((survey) => getSurveyTileUrl(survey)).map((survey, index) => (
                              <li key={survey.id} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm">
                                <span className="w-3 shrink-0 tabular-nums text-muted-foreground">{index + 1}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block break-words font-medium">{survey.id}</span>
                                  <span className="text-muted-foreground">{getSurveyLabel(survey)}</span>
                                </span>
                                {index === 0 && surveyIds.length > 1 && <Badge variant="outline" className="rounded font-normal">In front</Badge>}
                              </li>
                            ))}
                            {surveyIds.length === 0 && <li className="py-2 text-sm text-muted-foreground">No survey images available</li>}
                          </ol>
                        </PopoverContent>
                      </Popover>
                    </>
                  ) : <span className="font-medium">{surveys[0].id}<span className="ml-1.5 font-normal text-muted-foreground">{getSurveyLabel(surveys[0])}</span></span>}
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2 border-t pt-3" role="group" aria-label="Orthomap controls">
                <div className="w-full min-w-0 sm:w-64">
                  <Label htmlFor="orthomap-survey" className="sr-only">Survey</Label>
                  <Select value={activeSurveyId} onValueChange={selectSurvey}>
                    <SelectTrigger id="orthomap-survey" aria-label="Survey" className="w-full min-w-0 data-[size=default]:h-11 sm:data-[size=default]:h-8 [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:text-left">
                      <Layers aria-hidden="true" className="size-3.5 text-muted-foreground" />
                      <SelectValue>{isOverview ? "All surveys" : activeSurveyId}</SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start" collisionPadding={16} className="max-w-[calc(100vw-32px)]">
                      {orderedSurveys.map((survey) => (
                        <SelectItem key={survey.id} value={String(survey.id)} className="min-h-11 sm:min-h-8">
                          <span className="flex flex-wrap gap-x-2">
                            <span>{survey.id}</span>
                            <span className="text-muted-foreground">{getSurveyLabel(survey)}</span>
                          </span>
                        </SelectItem>
                      ))}
                      <SelectItem value={ALL_SURVEYS} className="min-h-11 sm:min-h-8">All surveys</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <SurveyModeToggle compact />
                <div className="order-4 w-full min-w-0 sm:order-none sm:w-auto">
                  <OrthomapFoiSelector detectedObjects={safeDetectedObjects} />
                </div>
                <Button type="button" size="sm" variant="outline" aria-pressed={showBoundaries}
                  className={`order-3 h-11 sm:order-none sm:h-8 ${showBoundaries ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => setShowBoundaries((value) => !value)}>
                  <Scan aria-hidden="true" className="size-3.5" /> Boundaries
                </Button>
              </div>
            </CardHeader>

            <CardContent className="relative flex min-h-80 min-w-0 flex-1 flex-col px-4 sm:px-5">
              <div className="isolate flex min-h-80 min-w-0 flex-1 overflow-hidden rounded-lg bg-muted">
                <Map
                  id="orthomap"
                  style={{ width: "100%", height: "100%", minHeight: 320 }}
                  initialViewState={initialViewState}
                  minZoom={11}
                  maxZoom={23}
                  mapStyle={ORTHOMAP_STYLE}
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

                  <Source id="areas" type="geojson" data={boundaryData.areas} generateId={true}>
                    <Layer id="area-fills" type="fill"
                      paint={{ "fill-color": MAP_COLORS.boundary, "fill-opacity": showBoundaries ? 0.08 : 0 }} />
                  </Source>
                  <Source id="area-labels" type="geojson" data={boundaryData.labels}>
                    <Layer id="area-labels" type="symbol" layout={{
                      "text-field": ["get", "label"], "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 16, 14, 20, 18],
                      "text-anchor": "center", "text-allow-overlap": true, "text-ignore-placement": true,
                      visibility: showBoundaries ? "visible" : "none",
                    }} paint={{
                      "text-color": "#ffffff", "text-halo-color": MAP_COLORS.boundary,
                      "text-halo-width": 2, "text-halo-blur": 1,
                    }} />
                  </Source>

                  <RasterTiles surveys={surveys} />
                  <ActiveSurveyView bounds={bounds} rasterIds={surveyIds} />

                  {surveys.length > 0 && surveys[0].code && (
                    <FeaturesOfInterest
                      key={surveyMode}
                      code={String(surveys[0].code)}
                      detectedObjects={safeDetectedObjects}
                    />
                  )}

                  <BoundaryLayers showBoundaries={showBoundaries} />

                  <MapEvents
                    isOverview={isOverview}
                    onChooseSurvey={selectSurvey}
                    surveys={surveys}
                    showBoundaries={showBoundaries}
                    code={
                      surveys[0]?.code ? String(surveys[0].code) : undefined
                    }
                    detectedObjects={safeDetectedObjects}
                  />

                  <MapPopup />
                  <PlantPopup />
                  {surveyMode === "inventory" && selectedFoi && selectedFoi !== "none" && <InventoryLegend detectedObjects={safeDetectedObjects} />}
                  <AnimatePresence>
                    {selectedFoi && selectedFoi !== "none" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <MapLegend />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Map>
              </div>
            </CardContent>

            <CardFooter className="px-4 sm:px-5">
              <SourceLoadingStatus key={activeSurveyId} idList={surveyIds} />
            </CardFooter>
          </Card>
        </div>
      </MapProvider>
    </div>
  );
}
