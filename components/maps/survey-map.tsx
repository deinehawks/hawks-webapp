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
  generateFeatureCollectionByFoi,
} from "@/lib/helpers";
import type { ComputerVisionObject } from "@/lib/types";
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
import { ElevationModelCard } from "@/components/elevation-model-card";
import { ThreeDimensionalModelSelector } from "@/components/selectors/3d-model-selector";
import { DemSelector } from "@/components/selectors/dem-selectors";
import { FoiSelector } from "@/components/selectors/foi-selector";
import { VegetationIndexSelector } from "@/components/selectors/vegetation-index-selector";
import { VegetationIndexCard } from "@/components/vegetation-index-card";
import ThreeDimensionalModelCaller from "@/components/callers/3d-caller";

function SurveyMapEvents({
  survey,
  detectedObjects,
}: {
  survey: any;
  detectedObjects: ComputerVisionObject[];
}) {
  const { current: map } = useMap();
  const { setPopupInfo } = useSurveyMapStore((state) => state);

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

      const { centerLng, centerLat } = calculateCentersUsingMinMaxXY(
        min_lon,
        max_lon,
        min_lat,
        max_lat
      );

      setPopupInfo({ pairId, areaId, centerLng, centerLat });
    },
    [detectedObjects, setPopupInfo]
  );

  useEffect(() => {
    if (!map) return;

    map.on("click", `${survey.id}-unhealthy-fill`, handleBboxClick);

    return () => {
      map.off("click", `${survey.id}-unhealthy-fill`, handleBboxClick);
    };
  }, [map, survey, handleBboxClick]);

  return null;
}

function FeaturesOfInterest({
  detectedObjects,
}: {
  detectedObjects: ComputerVisionObject[];
}) {
  const { selectedFoi } = useSurveyMapStore((state) => state);

  const id = detectedObjects.at(0)?.areaCode;

  const healthyBananas = useMemo(() => {
    if (!detectedObjects) return "";
    return generateFeatureCollectionByFoi(
      detectedObjects,
      "Banana Plant (Healthy-looking)"
    );
  }, [detectedObjects]);

  const unhealthyBananas = useMemo(() => {
    if (!detectedObjects) return "";
    return generateFeatureCollectionByFoi(
      detectedObjects,
      "Banana Plant (Infected)"
    );
  }, [detectedObjects]);

  return (
    <>
      {(selectedFoi === "healthy" || selectedFoi === "all") && (
        <Source id={`${id}-healthy`} type="geojson" data={healthyBananas}>
          <Layer
            id={`${id}-healthy-fill`}
            type="fill"
            source={`${id}-healthy`}
            paint={{
              "fill-color": "#008000",
              "fill-opacity": 0.1,
            }}
          />
          <Layer
            id={`${id}-healthy-border`}
            type="line"
            source={`${id}-healthy`}
            paint={{
              "line-color": "#008000",
              "line-width": 1,
            }}
          />
        </Source>
      )}
      {(selectedFoi === "unhealthy" || selectedFoi === "all") && (
        <Source id={`${id}-unhealthy`} type="geojson" data={unhealthyBananas}>
          <Layer
            id={`${id}-unhealthy-fill`}
            type="fill"
            source={`${id}-unhealthy`}
            paint={{
              "fill-color": "#ff0000",
              "fill-opacity": 0.1,
            }}
          />
          <Layer
            id={`${id}-unhealthy-border`}
            type="line"
            source={`${id}-unhealthy`}
            paint={{
              "line-color": "#ff0000",
              "line-width": 1,
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
        <div className=" font-semibold">Object Information</div>
        <Separator />
        <div className="flex flex-col">
          <div className="grid grid-cols-2 gap-2">
            <span className="">Object ID:</span>
            <span className="text-muted-foreground">{pairId}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="">Area ID:</span>
            <span className="text-muted-foreground">{areaId}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="">Longitude:</span>
            <span className="text-muted-foreground">
              {centerLng.toFixed(6)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="">Latitude:</span>
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
}: {
  detectedObjects: ComputerVisionObject[];
}) {
  const [activeTab, setActiveTab] = useState("ortho");

  // Memoized calculations
  const { centerLng, centerLat } = useMemo(() => {
    if (!survey) return { centerLat: 0, centerLng: 0 };
    const { min_x, max_x, min_y, max_y } = survey;
    return calculateCentersUsingMinMaxXY(min_x, max_x, min_y, max_y);
  }, [survey]);

  const bounds = useMemo(() => {
    if (!survey) return null;
    return findExtremeCoordinates(survey.geojson_boundaries);
  }, [survey]);

  const numBananas = useMemo(() => {
    if (!detectedObjects) return null;
    return detectedObjects.filter((object) => object.label.includes("Banana"))
      .length;
  }, [detectedObjects]);

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
            {" "}
            View{" "}
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
              {/* {survey.tags.includes("multispectral") && (
                <SelectItem value="plant-health">Plant Health</SelectItem>
              )} */}
              {/* {survey.tags.includes("lidar") && (
                <SelectItem value="dem">Elevation Model</SelectItem>
              )} */}
              <SelectItem value="3d">3D Model</SelectItem>
            </SelectContent>
          </Select>
          <TabsList className="@4xl/main:flex hidden">
            <TabsTrigger value="ortho">Orthomosaic</TabsTrigger>
            {/* {survey.tags.includes("multispectral") && (
              <TabsTrigger value="plant-health" className="gap-1">
                Plant Health
              </TabsTrigger>
            )} */}
            {/* {survey.tags.includes("lidar") && (
              <TabsTrigger value="dem" className="gap-1">
                Elevation Model
              </TabsTrigger>
            )} */}
            {survey.tags.includes("rgb") && (
              <TabsTrigger value="3d">3D Model</TabsTrigger>
            )}
          </TabsList>
        </div>
        <div className="flex flex-1 h-full px-4 lg:px-6">
          <div className="grid grid-cols-1 gap-4 h-full w-full lg:grid-cols-[3fr_1fr]">
            <div className="flex flex-1 h-full">
              <Card className="container/card flex flex-1 flex-col h-full">
                <CardHeader>
                  <CardTitle> {survey.id} </CardTitle>
                  <CardDescription>
                    {`${survey.code} | ${survey.area_code} | ${format(
                      survey.flight_date,
                      "dd MMMM yyyy"
                    )} | ${survey.location}`}
                  </CardDescription>
                  {/* <CardDescription>
                    {`Sample Data | ${survey.area_code} | ${format(
                      survey.flight_date,
                      "dd MMMM yyyy"
                    )} | Davao City`}
                  </CardDescription> */}
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex h-96 lg:h-full">
                    {activeTab !== "3d" && (
                      <Map
                        id="survey-map"
                        initialViewState={{
                          longitude: centerLng,
                          latitude: centerLat,
                          bounds: bounds,
                          fitBoundsOptions: { padding: 15 },
                        }}
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
                        <SurveyMapEvents
                          survey={survey}
                          detectedObjects={detectedObjects}
                        />
                        {activeTab === "ortho" && (
                          <>
                            <Source
                              id="ortho"
                              type="raster"
                              tiles={[
                                `/asimov-hawks/tiles/${survey.code.toLowerCase()}/${getYear(
                                  survey.flight_date
                                )}/${
                                  survey.id
                                }/${activeTab}/round-corners/{z}/{x}/{y}.png`,
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
                              />
                            </Source>
                            <FeaturesOfInterest
                              detectedObjects={detectedObjects}
                            />
                            <ObjectPopup />
                          </>
                        )}
                        {/* {activeTab === "plant-health" && (
                          <Source
                            id="ortho"
                            type="raster"
                            tiles={[
                              `/asimov-hawks/tiles/${survey.code.toLowerCase()}/${getYear(
                                survey.flight_date
                              )}/${
                                survey.id
                              }/${activeTab}/round-corners/{z}/{x}/{y}.png`,
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
                            />
                          </Source>
                        )} */}
                      </Map>
                    )}
                    {activeTab === "3d" && (
                      <div className="flex h-full w-full min-w-0 bg-primary">
                        <ThreeDimensionalModelCaller survey={survey} />{" "}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <TabsContent value="ortho">
              <Card className="container/card flex flex-1 flex-col lg:h-full">
                <CardHeader>
                  <CardTitle> Orthomosaic </CardTitle>
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
                      free from disttortions and perspective errors.
                    </div>
                    <Table className="w-full table-auto text-left">
                      <TableBody>
                        <TableRow>
                          <TableCell> Area </TableCell>
                          <TableCell> {survey.area?.toFixed(2)} ha</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell> No. of Images </TableCell>
                          <TableCell>{survey.ortho?.num_images}</TableCell>
                        </TableRow>
                        {/* <TableRow>
                          <TableCell>GPS Error</TableCell>
                          <TableCell>
                            {survey.ortho?.gps_error.toFixed(2)} m
                          </TableCell>
                        </TableRow> */}
                        <TableRow>
                          <TableCell>Crop Inventory</TableCell>
                          <TableCell>{numBananas?.toLocaleString()}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                <CardHeader>
                  <CardTitle> Plant Disease Detection </CardTitle>
                  {/* <CardDescription> OD-MODEL-123V25 </CardDescription> */}
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
                    <FoiSelector detectedObjects={detectedObjects} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plant-health">
              <Card className="container/card flex flex-1 flex-col gap-4 lg:h-full">
                <CardHeader>
                  <CardTitle> Plant Health </CardTitle>
                  <CardDescription>{survey.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div>
                      Vegetation indices provide insights into plant health by
                      analyzing the reflection and absorption of specific
                      wavelengths of light to estimate factors like chlorophyll
                      content and biomass.
                    </div>
                    <VegetationIndexSelector />
                  </div>
                </CardContent>
                <VegetationIndexCard />
              </Card>
            </TabsContent>

            <TabsContent value="dem">
              <Card className="container/card flex flex-1 flex-col gap-4 lg:h-full">
                <CardHeader>
                  <CardTitle> Digital Elevation Model </CardTitle>
                  <CardDescription>{survey.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div>
                      A digital elevation model (DEM) is a 3D representation of
                      the Earth&apos;s surface. It includes terrain features
                      like mountains, valleys, and plains.
                    </div>
                    <DemSelector />
                  </div>
                </CardContent>
                <ElevationModelCard />
              </Card>
            </TabsContent>

            <TabsContent value="3d">
              <Card className="container/card flex flex-1 flex-col gap-4 lg:h-full">
                <CardHeader>
                  <CardTitle> 3D Model </CardTitle>
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
                    <ThreeDimensionalModelSelector code={survey.code} />
                  </div>
                </CardContent>
                <ThreeDimensionalModelCard pcd={survey.point_cloud} />
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
