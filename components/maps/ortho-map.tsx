"use client";

import {
  calculateGlobalCenters,
  findExtremeCoordinates,
  generateFeatureCollectionByFoi,
  getUniqueYears,
} from "@/lib/helpers";
import { Layer, LngLatLike, Map, Source, useMap } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useMemo, useState } from "react";
import { useOrthoMapStore } from "@/providers/ortho-map-store-provider";
import { Badge } from "@/components/ui/badge";
import type { ComputerVisionObject } from "@/lib/types";

function OrthomapFoiSelector({
  detectedObjects,
}: {
  detectedObjects: ComputerVisionObject[];
}) {
  const { selectedFoi, setSelectedFoi } = useOrthoMapStore((state) => state);

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
        <SelectValue placeholder="Select feature of interest" />
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
        <Source id={`${code}-healthy`} type="geojson" data={healthyBananas}>
          <Layer
            id={`${code}-healthy-fill`}
            type="fill"
            source={`${code}-healthy`}
            paint={{
              "fill-color": "#008000",
              "fill-opacity": 0.1,
            }}
          />
          <Layer
            id={`${code}-healthy-border`}
            type="line"
            source={`${code}-healthy`}
            paint={{
              "line-color": "#008000",
              "line-width": 1,
            }}
          />
        </Source>
      )}
      {(selectedFoi === "unhealthy" || selectedFoi === "all") && (
        <Source id={`${code}-unhealthy`} type="geojson" data={unhealthyBananas}>
          <Layer
            id={`${code}-unhealthy-fill`}
            type="fill"
            source={`${code}-unhealthy`}
            paint={{
              "fill-color": "#ff0000",
              "fill-opacity": 0.1,
            }}
          />
          <Layer
            id={`${code}-unhealthy-border`}
            type="line"
            source={`${code}-unhealthy`}
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

function ObjectDetectionBoundingBoxes({ data, foi }: { foi: string }) {
  const healthyBananas = generateFeatureCollectionByFoi(
    data,
    "Banana Plant (Healthy-looking)"
  );

  const unhealthyBananas = generateFeatureCollectionByFoi(
    data,
    "Banana Plant (Infected)"
  );

  return (
    <>
      {(foi === "healthy" || foi === "all") && (
        <Source
          id="overview-healthy-bananas"
          type="geojson"
          data={healthyBananas}
        >
          <Layer
            id="healthyBanana-fills"
            type="fill"
            source="overview-healthy-bananas"
            paint={{
              "fill-color": "#008000",
              "fill-opacity": 0.1,
            }}
          />
          <Layer
            id="healthyBanana-borders"
            type="line"
            source="overview-healthy-bananas"
            paint={{
              "line-color": "#008000",
              "line-width": 1,
            }}
          />
        </Source>
      )}
      {(foi === "unhealthy" || foi === "all") && (
        <Source id="unhealthy-bananas" type="geojson" data={unhealthyBananas}>
          <Layer
            id="unhealthy-fills"
            type="fill"
            source="unhealthy-bananas"
            paint={{
              "fill-color": "#ff0000",
              "fill-opacity": 0.1,
            }}
          />
          <Layer
            id="unhealthy-borders"
            type="line"
            source="unhealthy-bananas"
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

export default function OrthoMap({ userProfile, surveys, detectedObjects }) {
  // States
  const [flightYear, setFlightYear] = useState("");

  // Memoized calculations
  const uniqueFlightYears = useMemo(() => {
    if (!surveys) return [];
    return getUniqueYears(
      surveys.map((survey) => survey.flight_date as Date) || []
    );
  }, [surveys]);

  const { global_x, global_y } = useMemo(() => {
    if (surveys)
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
        defaultValue={uniqueFlightYears.at(uniqueFlightYears.length - 1)}
        className="flex w-full flex-col justify-start gap-6"
      >
        <div className="flex items-center justify-between px-4 lg:px-6">
          <Label htmlFor="year-selector" className="sr-only">
            Year
          </Label>
          <Select
            defaultValue={uniqueFlightYears.at(uniqueFlightYears.length - 1)}
          >
            <SelectTrigger
              className="@4xl/main:hidden flex w-fit"
              id="year-selector"
            >
              <SelectValue placeholder="Select flight year" />
            </SelectTrigger>
            <SelectContent>
              {uniqueFlightYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TabsList className="@4xl/main:flex hidden">
            {uniqueFlightYears.map((year) => (
              <TabsTrigger
                key={year}
                value={year}
                className="gap-1 :first-child:gap-0 :last-child:gap-0"
              >
                {year}
              </TabsTrigger>
            ))}
          </TabsList>
          <OrthomapFoiSelector detectedObjects={detectedObjects} />
        </div>
      </Tabs>

      <div className="flex flex-1 h-full px-4 lg:px-6">
        <Card className="@container/card flex flex-1 flex-col h-full">
          <CardHeader>
            <CardTitle> {userProfile.organization.code} </CardTitle>
            <CardDescription>{userProfile.organization.name}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="h-full flex">
              <Map
                id="overview"
                initialViewState={{
                  latitude: global_y,
                  longitude: global_x,
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
              >
                {surveys.map((survey) => (
                  <Source
                    key={survey.id}
                    id={survey.id}
                    type="raster"
                    tiles={[
                      `/asimov-hawks/tiles/${survey.code.toLowerCase()}/${flightYear}/${
                        survey.id
                      }/ortho/round-corners/{z}/{x}/{y}.png`,
                    ]}
                    scheme="tms"
                    tileSize={256}
                    minzoom={15}
                    maxzoom={25}
                  >
                    <Layer
                      id={survey.id}
                      type="raster"
                      source={survey.id}
                      minzoom={15}
                      maxzoom={24}
                    />
                  </Source>
                ))}
                <FeaturesOfInterest
                  code={surveys.at(0).code}
                  detectedObjects={detectedObjects}
                />
              </Map>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
