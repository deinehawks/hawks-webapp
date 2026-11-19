"use client";

import {
  SurveyDetailsPopup,
  type SurveyDetails,
} from "./shared/survey-details-popup";
import { calculateGlobalCenters, findExtremeCoordinates } from "@/lib/helpers";
import { LngLatLike, Map, useMap } from "@vis.gl/react-maplibre";
import type { MapMouseEvent } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Feature, GeoJsonProperties, Point, Polygon } from "geojson";
import { getSurveyChoices } from "@/lib/helpers/survey-selection";
import { SurveyChoicePopup, type SurveyChoiceLocation } from "./shared/survey-choice-popup";

type CoordinatePair = [string | number, string | number];
type DashboardSurvey = SurveyDetails & {
  geojson_boundaries: CoordinatePair[];
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
};
type DashboardPopupInfo = DashboardSurvey & {
  lat: number;
  lng: number;
  opacity: number;
};

// Calculate polygon centroid
function calculateCentroid(coordinates: number[][][]): [number, number] {
  let sumX = 0;
  let sumY = 0;
  const points = coordinates[0]; // First ring of polygon

  for (let i = 0; i < points.length; i++) {
    sumX += points[i][0];
    sumY += points[i][1];
  }

  return [sumX / points.length, sumY / points.length];
}

function MapPopup({
  popupInfo,
  setPopupInfo,
  surveyHrefBase,
}: {
  popupInfo: DashboardPopupInfo;
  setPopupInfo: Dispatch<SetStateAction<DashboardPopupInfo | null>>;
  surveyHrefBase: string;
}) {
  return popupInfo ? (
    <SurveyDetailsPopup survey={popupInfo} longitude={popupInfo.lng} latitude={popupInfo.lat}
      onClose={() => setPopupInfo(null)} surveyHrefBase={surveyHrefBase} />
  ) : null;
}

function MapEvents({
  data,
  setPopupInfo,
  onSurveySelect,
}: {
  data: DashboardSurvey[];
  setPopupInfo: Dispatch<SetStateAction<DashboardPopupInfo | null>>;
  onSurveySelect?: (surveyId: string) => void;
}) {
  const { current: map } = useMap();
  const hoveredAreaIdRef = useRef<string | number | null>(null);

  const [choice, setChoice] = useState<SurveyChoiceLocation<DashboardSurvey> | null>(null);

  const chooseSurvey = useCallback((survey: DashboardSurvey) => {
    setChoice(null);
    const coordinates = [survey.geojson_boundaries.map((pair) => [
      Number(pair[0]), Number(pair[1]),
    ])];
    const [lng, lat] = calculateCentroid(coordinates);
    setPopupInfo({ ...survey, lat, lng, opacity: 1 });
    onSurveySelect?.(String(survey.id));
    map?.flyTo({
      center: [lng, lat], zoom: Math.max(map.getZoom(), 16),
      padding: { top: 300, bottom: 25, left: 50, right: 50 }, duration: 1400,
    });
  }, [map, onSurveySelect, setPopupInfo]);

  const handleMapClick = useCallback((event: MapMouseEvent) => {
    if (!map?.getLayer("area-fills")) return;
    const candidates = getSurveyChoices(
      map.queryRenderedFeatures(event.point, { layers: ["area-fills"] }), data ?? [],
    );
    setPopupInfo(null);
    setChoice(null);
    if (candidates.length === 1) chooseSurvey(candidates[0]);
    else if (candidates.length > 1) setChoice({
      longitude: event.lngLat.lng, latitude: event.lngLat.lat, surveys: candidates,
    });
  }, [data, map, chooseSurvey, setPopupInfo]);

  useEffect(() => { setChoice(null); }, [data]);

  const handleMouseMove = useCallback(
    (e: MapMouseEvent) => {
      if (!map || !e.features?.length) return;

      map.getCanvas().style.cursor = "pointer";

      if (hoveredAreaIdRef.current !== null) {
        map.setFeatureState(
          { source: "areas", id: hoveredAreaIdRef.current },
          { hover: false },
        );
      }
      const featureId = e.features[0]?.id;
      if (featureId == null) return;
      hoveredAreaIdRef.current = featureId;
      map.setFeatureState(
        { source: "areas", id: hoveredAreaIdRef.current },
        { hover: true },
      );
    },
    [map],
  );

  const handleMouseLeave = useCallback(() => {
    if (!map) return;
    map.getCanvas().style.cursor = "";
    if (hoveredAreaIdRef.current !== null) {
      map.setFeatureState(
        { source: "areas", id: hoveredAreaIdRef.current },
        { hover: false },
      );
      hoveredAreaIdRef.current = null;
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    map.on("click", handleMapClick);
    map.on("mousemove", "area-fills", handleMouseMove);
    map.on("mouseleave", "area-fills", handleMouseLeave);

    return () => {
      map.off("click", handleMapClick);
      map.off("mousemove", "area-fills", handleMouseMove);
      map.off("mouseleave", "area-fills", handleMouseLeave);
    };
  }, [map, handleMapClick, handleMouseMove, handleMouseLeave]);

  useEffect(() => {
    if (!map || !data.length) return;

    const bounds: LngLatLike[][] = data.map((area) =>
      area.geojson_boundaries.map((pair) => [
        Number(pair[0]),
        Number(pair[1]),
      ]),
    );

    const extremePoints = findExtremeCoordinates(bounds);
    if (!extremePoints) return;

    map.fitBounds(extremePoints, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      duration: 1000,
    });
  }, [map, data]);

  return choice ? <SurveyChoicePopup choice={choice} onChoose={chooseSurvey}
    onClose={() => setChoice(null)} /> : null;
}

export default function MapLibre({
  data: surveys,
  onSurveySelect,
  surveyHrefBase = "/dashboard/surveys",
}: {
  data: DashboardSurvey[];
  onSurveySelect?: (surveyId: string) => void;
  selectedSurveyId?: string | null;
  surveyHrefBase?: string;
}) {
  const [popupInfo, setPopupInfo] = useState<DashboardPopupInfo | null>(null);

  const { global_x, global_y } = calculateGlobalCenters(surveys);

  const initialViewState = {
    latitude: global_y,
    longitude: global_x,
    zoom: 15,
  };

  // Create polygon features
  const polygonFeatures: Feature<Polygon, GeoJsonProperties>[] = surveys.map((survey) => {
    const coordinates = [
      survey.geojson_boundaries.map((pair) => [
        Number(pair[0]),
        Number(pair[1]),
      ]),
    ];
    return {
      type: "Feature",
      properties: {
        survey_id: survey.id,
      },
      geometry: {
        type: "Polygon",
        coordinates: coordinates,
      },
    };
  });

  // Create separate point features for labels at polygon centroids
  const labelFeatures: Feature<Point, GeoJsonProperties>[] = surveys.map((survey) => {
    const coordinates = [
      survey.geojson_boundaries.map((pair) => [
        Number(pair[0]),
        Number(pair[1]),
      ]),
    ];
    const centroid = calculateCentroid(coordinates);

    return {
      type: "Feature",
      properties: {
        survey_id: survey.id,
        label: `${survey.access_code}-${survey.area_code}`,
      },
      geometry: {
        type: "Point",
        coordinates: centroid,
      },
    };
  });

  return (
    <Map
      initialViewState={initialViewState}
      minZoom={12}
      maxZoom={23}
      mapStyle={{
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 19,
            attribution: "© OpenStreetMap contributors",
          },
          areas: {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: polygonFeatures,
            },
            generateId: true,
          },
          "area-labels": {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: labelFeatures,
            },
          },
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#f0f0f0" },
          },
          {
            id: "osm",
            type: "raster",
            source: "osm",
            paint: {
              "raster-opacity": 0.85,
            },
          },
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
          {
            id: "area-borders",
            type: "line",
            source: "areas",
            paint: {
              "line-color": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                "#0284c7",
                "#0891b2",
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
            },
          },
          {
            id: "area-glow",
            type: "line",
            source: "areas",
            paint: {
              "line-color": "#0ea5e9",
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
                12,
                10,
                16,
                14,
                20,
                18,
              ],
              "text-anchor": "center",
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "#0891b2",
              "text-halo-width": 2,
              "text-halo-blur": 1,
            },
          },
        ],
      }}
      attributionControl={{ compact: true }}
    >
      <MapEvents data={surveys} setPopupInfo={setPopupInfo} onSurveySelect={onSurveySelect} />
      {popupInfo && (
        <MapPopup popupInfo={popupInfo} setPopupInfo={setPopupInfo} surveyHrefBase={surveyHrefBase} />
      )}
    </Map>
  );
}
