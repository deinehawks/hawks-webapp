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

    // Only add if not already added
    if (!orthomap.hasImage("pin-yellow")) {
      const img = new Image();
      img.onload = () => orthomap.addImage("pin-yellow", img);
      img.src = `data:image/svg+xml;base64,${btoa(PIN_IMAGES.yellow)}`;
    }

    if (!orthomap.hasImage("pin-red")) {
      const img = new Image();
      img.onload = () => orthomap.addImage("pin-red", img);
      img.src = `data:image/svg+xml;base64,${btoa(PIN_IMAGES.red)}`;
    }
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

  return (
    <>
      {/* HEALTHY HEATMAP - renders first */}
      {(selectedFoi === "healthy" || selectedFoi === "all") && (
        <Source id={`${code}-healthy`} type="geojson" data={healthyBananas}>
          <Layer
            id={`${code}-healthy-heatmap`}
            type="heatmap"
            source={`${code}-healthy`}
            maxzoom={18.8}
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
                15,
                15,
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
            maxzoom={18.8}
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
                15,
                15,
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
            minzoom={18.8}
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
            minzoom={18.8}
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
                  maxZoom={25}
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
