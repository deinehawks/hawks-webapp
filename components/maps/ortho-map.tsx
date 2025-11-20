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

// Pin SVG images
const PIN_IMAGES = {
  yellow: `<svg width="32" height="48" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2C8.27 2 2 8.27 2 16c0 8 14 28 14 28s14-20 14-28c0-7.73-6.27-14-14-14z" fill="#fbc02d" stroke="#fff" stroke-width="2"/>
    <circle cx="16" cy="16" r="5" fill="#fff"/>
  </svg>`,
  red: `<svg width="32" height="48" viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2C8.27 2 2 8.27 2 16c0 8 14 28 14 28s14-20 14-28c0-7.73-6.27-14-14-14z" fill="#ff0000" stroke="#fff" stroke-width="2"/>
    <circle cx="16" cy="16" r="5" fill="#fff"/>
  </svg>`,
};

/**
 * Calculate optimal zoom levels based on data density
 *
 * Analyzes the spread and density of features to determine when:
 * - Heatmap should be shown (zoomed out)
 * - Individual pins should be shown (zoomed in)
 */
function calculateOptimalZoomLevels(features: any[]) {
  if (!features || features.length === 0) {
    return { heatmapMaxZoom: 15, pinMinZoom: 15 };
  }

  // Extract coordinates
  const coords = features
    .filter((f) => f.geometry?.coordinates)
    .map((f) => f.geometry.coordinates);

  if (coords.length === 0) {
    return { heatmapMaxZoom: 15, pinMinZoom: 15 };
  }

  // Calculate bounding box
  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;

  // Calculate average distance between points (simplified)
  const avgSpan = (lonSpan + latSpan) / 2;

  // ADJUST THESE VALUES to control when heatmap appears
  // Larger spread = show pins at higher zoom level = heatmap shows longer
  // Smaller spread = show pins at lower zoom level = heatmap disappears sooner
  let zoomThreshold = 15;

  if (avgSpan > 0.1) {
    // Large area spread - pins are far apart
    // ADJUST: Increase to show heatmap longer, decrease to show pins sooner
    zoomThreshold = 30;
  } else if (avgSpan > 0.05) {
    // Medium spread
    // ADJUST: Increase to show heatmap longer, decrease to show pins sooner
    zoomThreshold = 28;
  } else if (avgSpan > 0.01) {
    // Small spread - pins close together
    // ADJUST: Increase to show heatmap longer, decrease to show pins sooner
    zoomThreshold = 26;
  } else {
    // Very tight cluster
    // ADJUST: Increase to show heatmap longer, decrease to show pins sooner
    zoomThreshold = 24;
  }

  // Density based adjustment
  // More points = show heatmap longer
  const density = features.length / (avgSpan * avgSpan || 1);

  if (density > 1000) {
    // Very high density - extend heatmap
    // ADJUST: Change +1 to +2 for longer heatmap, 0 for no adjustment
    zoomThreshold = Math.min(19, zoomThreshold + 1);
  } else if (density < 10) {
    // Low density - reduce heatmap
    // ADJUST: Change -2 to -3 for shorter heatmap, 0 for no adjustment
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

    console.log("layers", orthomap.getLayersOrder());

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

    // Convert SVG to canvas and then to image data
    const loadSvgImage = (svgString: string, id: string) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to convert image
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        // Convert canvas to ImageData
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

    // Load both images
    loadSvgImage(PIN_IMAGES.yellow, "pin-yellow");
    loadSvgImage(PIN_IMAGES.red, "pin-red");
  }, [orthomap]);

  return null;
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

  // Calculate dynamic zoom levels based on data density
  const healthyZoomLevels = useMemo(() => {
    if (!healthyBananas || healthyBananas === "")
      return { heatmapMaxZoom: 15, pinMinZoom: 15 };
    const levels = calculateOptimalZoomLevels(
      (healthyBananas as any).features || []
    );
    // Lower the pin visibility threshold by 1-2 levels to prevent overlapping
    return {
      heatmapMaxZoom: levels.heatmapMaxZoom,
      pinMinZoom: Math.max(13, levels.pinMinZoom - 1.5), // Show heatmap sooner
    };
  }, [healthyBananas]);

  const unhealthyZoomLevels = useMemo(() => {
    if (!unhealthyBananas || unhealthyBananas === "")
      return { heatmapMaxZoom: 15, pinMinZoom: 15 };
    const levels = calculateOptimalZoomLevels(
      (unhealthyBananas as any).features || []
    );
    // Lower the pin visibility threshold by 1-2 levels to prevent overlapping
    return {
      heatmapMaxZoom: levels.heatmapMaxZoom,
      pinMinZoom: Math.max(13, levels.pinMinZoom - 1.5), // Show heatmap sooner
    };
  }, [unhealthyBananas]);

  return (
    <>
      {/* HEALTHY HEATMAP - renders first */}
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
                "rgba(251, 192, 45, 0.4)",
                0.5,
                "rgba(251, 192, 45, 0.8)",
                1,
                "rgba(251, 192, 45, 1)",
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
              "heatmap-opacity": 0.8,
            }}
          />
        </Source>
      )}

      {/* UNHEALTHY HEATMAP - renders second */}
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
                "rgba(255, 0, 0, 0.4)",
                0.5,
                "rgba(255, 0, 0, 0.8)",
                1,
                "rgba(150, 0, 0, 1)",
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
              "heatmap-opacity": 0.8,
            }}
          />
        </Source>
      )}

      {/* HEALTHY PINS - renders third */}
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
                15,
                0.8,
                16,
                0.7,
                17,
                0.6,
              ],
              "icon-allow-overlap": true,
            }}
          />
        </Source>
      )}

      {/* UNHEALTHY PINS - renders last (on top) */}
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
                15,
                0.8,
                16,
                0.7,
                17,
                0.6,
              ],
              "icon-allow-overlap": true,
            }}
          />
        </Source>
      )}
    </>
  );
}

export default function OrthoMap({ userProfile, surveys, detectedObjects }) {
  // States
  const [flightYear, setFlightYear] = useState("");

  // Memoized calculations

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

  //
  useEffect(() => {
    setFlightYear(uniqueFlightYears.at(uniqueFlightYears.length - 1) || "");
  }, [uniqueFlightYears]);

  return (
    <div className="flex flex-1 flex-col h-full gap-4 py-4 md:gap-6 md:py-6">
      <Tabs
        // defaultValue={uniqueFlightYears.at(uniqueFlightYears.length - 1)}
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
          <OrthomapFoiSelector detectedObjects={detectedObjects} />
        </div>
      </Tabs>

      <MapProvider>
        <div className="flex flex-1 h-full px-4 lg:px-6">
          <Card className="@container/card flex flex-1 flex-col h-full">
            <CardHeader>
              <CardTitle> {userProfile.organization.code} </CardTitle>
              <CardDescription>{userProfile.organization.name}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
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
                  <MapEvents surveys={surveys} />
                  <MapPopup />
                </Map>
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
