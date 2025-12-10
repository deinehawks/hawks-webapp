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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateFeatureCollection } from "@/lib/helpers/geometry";
import { GeometryType, type ComputerVisionObject } from "@/lib/types";
import { useOrthoMapStore } from "@/providers/ortho-map-store-provider";
import { getYear } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

// CSS animations for pin drop effect
const pinAnimationStyles = `
  @keyframes dropPin {
    0% {
      opacity: 0;
      transform: translateY(-30px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .pin-drop {
    animation: dropPin 0.6s ease-out forwards;
  }
`;

// Pin SVG images with slight shadow for depth
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
  } else if (avgSpan > 0.01) {
    zoomThreshold = 18;
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

function MapEvents({ surveys }) {
  const { orthomap } = useMap();
  const { setPopupInfo } = useOrthoMapStore((state) => state);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!surveys || !e.features?.length) return;

      const clickedAreaData = surveys.find(
        (survey) => survey.id === e.features.at(0)?.properties.survey_id
      );

      if (clickedAreaData) {
        setPopupInfo({
          ...clickedAreaData,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        });
      }
    },
    [surveys, setPopupInfo]
  );

  useEffect(() => {
    if (!orthomap) return;

    orthomap.on("click", "area-fills", handleMapClick);

    return () => {
      orthomap.off("click", "area-fills", handleMapClick);
    };
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
          if (!orthomap.hasImage(id)) {
            orthomap.addImage(id, imageData);
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
  }, [orthomap]);

  return null;
}

function BoundariesToggle({ showBoundaries, setShowBoundaries }) {
  return (
    <div className="absolute top-4 right-4 z-10">
      <Button
        onClick={() => setShowBoundaries(!showBoundaries)}
        variant="outline"
        size="sm"
        className="shadow-lg flex items-center gap-2 px-3 py-2 min-w-[120px]"
      >
        <svg
          className="w-4 h-4"
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
        <span>{showBoundaries ? "Hide" : "Show"} Boundaries</span>
      </Button>
    </div>
  );
}

function MapLegend() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="absolute bottom-8 left-8 z-10">
      {/* Toggle Button */}
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

      {/* Legend Content */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs border border-gray-200 animate-in fade-in slide-in-from-left-2 duration-200">
          <div className="text-sm font-semibold text-gray-800 mb-3">Legend</div>

          <div className="space-y-3">
            {/* Healthy Plants */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-white shadow-md"></div>
              <div className="text-xs text-gray-700">
                <div className="font-medium">Healthy Plants</div>
                <div className="text-gray-500">No signs of disease</div>
              </div>
            </div>

            {/* Infected Plants */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-md"></div>
              <div className="text-xs text-gray-700">
                <div className="font-medium">Infected Plants</div>
                <div className="text-gray-500">Disease detected</div>
              </div>
            </div>

            {/* Heatmap */}
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
                <span className="text-gray-600">Low → High Density</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-3 italic">
            Zoom in to see individual plants
          </div>
        </div>
      )}
    </div>
  );
}

function MapPopup() {
  const { popupInfo, setPopupInfo } = useOrthoMapStore((state) => state);

  if (!popupInfo) return null;

  return (
    <Popup
      anchor="bottom"
      longitude={popupInfo?.lng}
      latitude={popupInfo?.lat}
      onClose={() => setPopupInfo(null)}
      closeOnClick={false}
      closeOnMove={false}
    >
      <div className="rounded-none p-1.5">
        <div className="flex flex-col">
          <div className="text-muted-foreground">{popupInfo.id}</div>
          <Link href={`/dashboard/surveys/${popupInfo.id}`}>
            <button className="text-primary font-medium underline-offset-4 hover:underline">
              View
            </button>
          </Link>
        </div>
      </div>
    </Popup>
  );
}

function SourceLoadingStatus({ idList }: { idList: string[] }) {
  const {
    currentLoadingSource,
    setCurrentLoadingSource,
    areAllSourcesLoaded,
    setAreAllSourcesLoaded,
  } = useOrthoMapStore((state) => state);

  const { orthomap } = useMap();

  useEffect(() => {
    if (!orthomap) return;
    orthomap.on("idle", () => {
      setAreAllSourcesLoaded(true);
    });

    return () => {
      orthomap.off("idle", () => {
        setAreAllSourcesLoaded(false);
      });
    };
  }, [orthomap]);

  return (
    <div className="text-sm text-muted-foreground">
      {" "}
      {areAllSourcesLoaded ? "All sources loaded." : `Loading map sources...`}
    </div>
  );
}

function OrthomapFoiSelector({
  detectedObjects,
}: {
  detectedObjects: ComputerVisionObject[];
}) {
  const { selectedFoi, setSelectedFoi } = useOrthoMapStore((state) => state);
  const [inputPlaceholder, setInputPlaceholder] = useState("");

  useEffect(() => {
    const handleWindowResize = () => {
      if (window.innerWidth < 768) {
        setInputPlaceholder("FOI");
      } else {
        setInputPlaceholder("feature of interest");
      }
    };

    handleWindowResize();

    window.addEventListener("resize", handleWindowResize);

    return () => window.removeEventListener("resize", handleWindowResize);
  });

  const numHealthyBananas = useMemo(() => {
    if (!detectedObjects) return 0;
    return detectedObjects.filter(
      (object: ComputerVisionObject) =>
        object.label === "Banana Plant (Healthy-looking)"
    ).length;
  }, [detectedObjects]);

  const numUnhealthyBananas = useMemo(() => {
    if (!detectedObjects) return 0;
    return detectedObjects.filter(
      (object: ComputerVisionObject) =>
        object.label === "Banana Plant (Infected)"
    ).length;
  }, [detectedObjects]);

  return (
    <Select value={selectedFoi} onValueChange={setSelectedFoi}>
      <SelectTrigger className="w-fit" id="foi-selector">
        <Label>Crop Status:</Label>
        <SelectValue placeholder={`Select ${inputPlaceholder}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Feature of Interest</SelectLabel>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="healthy" className="flex gap-2">
            <span> Healthy Banana </span>
            {selectedFoi === "healthy" && (
              <Badge variant="secondary" className="rounded-full">
                {numHealthyBananas}
              </Badge>
            )}
          </SelectItem>
          <SelectItem value="unhealthy" className="flex gap-2">
            <span> Unhealthy Banana </span>
            {selectedFoi === "unhealthy" && (
              <Badge variant="secondary" className="rounded-full">
                {numUnhealthyBananas}
              </Badge>
            )}
          </SelectItem>
          <SelectItem value="all" className="flex gap-2">
            <span> All </span>
            {selectedFoi === "all" && (
              <Badge variant="secondary" className="rounded-full">
                {numUnhealthyBananas + numHealthyBananas}
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

  const healthyBananas = useMemo(() => {
    if (!detectedObjects) return "";
    return generateFeatureCollection(
      GeometryType.Point,
      "Banana Plant (Healthy-looking)",
      detectedObjects
    );
  }, [detectedObjects]);

  const unhealthyBananas = useMemo(() => {
    if (!detectedObjects) return "";
    return generateFeatureCollection(
      GeometryType.Point,
      "Banana Plant (Infected)",
      detectedObjects
    );
  }, [detectedObjects]);

  const healthyZoomLevels = useMemo(() => {
    if (!healthyBananas || healthyBananas === "")
      return { heatmapMaxZoom: 15, pinMinZoom: 15 };
    const levels = calculateOptimalZoomLevels(
      (healthyBananas as any).features || []
    );
    return {
      heatmapMaxZoom: levels.heatmapMaxZoom,
      pinMinZoom: Math.max(13, levels.pinMinZoom - 1.5),
    };
  }, [healthyBananas]);

  const unhealthyZoomLevels = useMemo(() => {
    if (!unhealthyBananas || unhealthyBananas === "")
      return { heatmapMaxZoom: 15, pinMinZoom: 15 };
    const levels = calculateOptimalZoomLevels(
      (unhealthyBananas as any).features || []
    );
    return {
      heatmapMaxZoom: levels.heatmapMaxZoom,
      pinMinZoom: Math.max(13, levels.pinMinZoom - 1.5),
    };
  }, [unhealthyBananas]);

  return (
    <>
      {/* HEALTHY HEATMAP */}
      {(selectedFoi === "healthy" || selectedFoi === "all") && (
        <Source id={`${code}-healthy`} type="geojson" data={healthyBananas}>
          <Layer
            id={`${code}-healthy-heatmap`}
            type="heatmap"
            source={`${code}-healthy`}
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

      {/* UNHEALTHY HEATMAP */}
      {(selectedFoi === "unhealthy" || selectedFoi === "all") && (
        <Source id={`${code}-unhealthy`} type="geojson" data={unhealthyBananas}>
          <Layer
            id={`${code}-unhealthy-heatmap`}
            type="heatmap"
            source={`${code}-unhealthy`}
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

      {/* HEALTHY PINS */}
      {(selectedFoi === "healthy" || selectedFoi === "all") && (
        <Source
          id={`${code}-healthy-pins`}
          type="geojson"
          data={healthyBananas}
        >
          <Layer
            id={`${code}-healthy-pin`}
            type="symbol"
            source={`${code}-healthy-pins`}
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

      {/* UNHEALTHY PINS */}
      {(selectedFoi === "unhealthy" || selectedFoi === "all") && (
        <Source
          id={`${code}-unhealthy-pins`}
          type="geojson"
          data={unhealthyBananas}
        >
          <Layer
            id={`${code}-unhealthy-pin`}
            type="symbol"
            source={`${code}-unhealthy-pins`}
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

function BoundaryLayers({ showBoundaries }) {
  const { orthomap } = useMap();

  useEffect(() => {
    if (!orthomap) return;

    // Update layer visibility without recreating layers
    if (orthomap.getLayer("boundary-glow")) {
      orthomap.setLayoutProperty(
        "boundary-glow",
        "visibility",
        showBoundaries ? "visible" : "none"
      );
    }
    if (orthomap.getLayer("boundary-borders")) {
      orthomap.setLayoutProperty(
        "boundary-borders",
        "visibility",
        showBoundaries ? "visible" : "none"
      );
    }
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
        layout={{
          visibility: showBoundaries ? "visible" : "none",
        }}
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
        layout={{
          visibility: showBoundaries ? "visible" : "none",
        }}
      />
    </>
  );
}

export default function OrthoMap({ userProfile, surveys, detectedObjects }) {
  const [flightYear, setFlightYear] = useState("");
  const [showBoundaries, setShowBoundaries] = useState(false);

  const surveyIds = useMemo(() => {
    if (!surveys) return null;
    return surveys.map((survey) => survey.id);
  }, [surveys]);

  const uniqueFlightYears = useMemo(() => {
    if (!surveys) return [];
    return getUniqueYears(
      surveys.map((survey) => survey.flight_date as Date) || []
    );
  }, [surveys]);

  const { global_x, global_y } = useMemo(() => {
    if (!surveys)
      return { global_x: 125.58147596772221, global_y: 7.0763840759644 };
    return calculateGlobalCenters(surveys);
  }, [surveys]);

  const bounds = useMemo(() => {
    if (!surveys) return null;
    return findExtremeCoordinates(
      surveys.map((survey) => survey.geojson_boundaries)
    );
  }, [surveys]);

  useEffect(() => {
    setFlightYear(uniqueFlightYears.at(uniqueFlightYears.length - 1) || "");
  }, [uniqueFlightYears]);

  return (
    <div className="flex flex-1 flex-col h-full gap-4 py-4 md:gap-6 md:py-6">
      <style>{pinAnimationStyles}</style>

      <Tabs
        defaultValue="orthomap"
        className="flex w-full flex-col justify-start gap-6"
      >
        <div className="flex items-center justify-between px-4 lg:px-6">
          <Label htmlFor="year-selector" className="sr-only">
            Year
          </Label>
          <TabsList className="@4xl/main:flex">
            <TabsTrigger
              value="orthomap"
              className="gap-1 :first-child:gap-0 :last-child:gap-0"
            >
              Orthomap
            </TabsTrigger>
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
              <CardTitle> {userProfile.organization.code} </CardTitle>
              <CardDescription>{userProfile.organization.name}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 relative">
              <div className="h-full flex">
                <Map
                  id="orthomap"
                  initialViewState={{
                    latitude: global_y,
                    longitude: global_x,
                    bounds: bounds,
                    fitBoundsOptions: { padding: 15 },
                  }}
                  minZoom={10}
                  maxZoom={24}
                  mapStyle={{
                    version: 8,
                    sources: {
                      osm: {
                        type: "raster",
                        tiles: [
                          "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
                        ],
                        tileSize: 256,
                        attribution: "&copy; OpenStreetMap Contributors",
                      },
                      areas: {
                        type: "geojson",
                        data: {
                          type: "FeatureCollection",
                          features: surveys?.map((survey) => {
                            return {
                              type: "Feature",
                              properties: {
                                survey_id: survey.id,
                                latitude: Number(
                                  (survey.max_y + survey.min_y) / 2
                                ),
                                longitude: Number(
                                  (survey.max_x + survey.min_x) / 2
                                ),
                              },
                              geometry: {
                                type: "Polygon",
                                coordinates: [
                                  transformCoordinatesToLonLatFormat(
                                    survey.boundaries
                                  ),
                                ],
                              },
                            };
                          }),
                        },
                        generateId: true,
                      },
                    },
                    layers: [
                      {
                        id: "osm",
                        type: "raster",
                        source: "osm",
                      },
                      {
                        id: "area-fills",
                        type: "fill",
                        source: "areas",
                        paint: {
                          "fill-color": "#fff",
                          "fill-opacity": 0,
                        },
                      },
                    ],
                  }}
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
                    code={surveys.at(0).code}
                    detectedObjects={detectedObjects}
                  />
                  <BoundaryLayers showBoundaries={showBoundaries} />
                  <MapEvents surveys={surveys} />
                  <MapPopup />
                </Map>
                <MapLegend />
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
