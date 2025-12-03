"use client";

import { Separator } from "@/components/ui/separator";
import {
  calculateGlobalCenters,
  findExtremeCoordinates,
  transformCoordinatesToLonLatFormat,
} from "@/lib/helpers";
import { LngLatLike, Map, Marker, Popup, useMap } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

function MapMarker({ data, longitude, latitude, setPopupInfo }) {
  const { current: map } = useMap();

  return (
    <Marker
      latitude={latitude}
      longitude={longitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        setPopupInfo(data);
        map?.flyTo({ center: [longitude, latitude], zoom: 16 });
      }}
    ></Marker>
  );
}

function MapPopup({ popupInfo, setPopupInfo }) {
  return (
    <Popup
      anchor="bottom"
      longitude={popupInfo.lng}
      latitude={popupInfo.lat}
      style={{ opacity: popupInfo.opacity }}
      onClose={() => {
        setPopupInfo(null);
      }}
      closeOnClick={false}
      closeOnMove={false}
    >
      <div className="rounded-none p-1.5">
        <div className="flex flex-col">
          <div className="flex flex-1 text-xs text-muted-foreground">
            {popupInfo.id}
          </div>
          <div className="text-sm font-semibold">
            {" "}
            {`${popupInfo.access_code}-${popupInfo.area_code}`}{" "}
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-2 mt-2">
          <div className="grid grid-cols-2">
            <div> Area:</div>
            <div className="text-muted-foreground">
              {popupInfo.area.toFixed(2)} ha
            </div>
          </div>
        </div>
        <div className="mt-2">
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

function MapEvents({ data, setPopupInfo }) {
  const { current: map } = useMap();
  const hoveredAreaIdRef = useRef(null);

  const handleMapClick = useCallback(
    (e) => {
      if (!data || !e.features?.length) return;

      const clickedAreaData = data.find(
        (datum) => datum.id === e.features[0]?.properties.survey_id
      );

      if (clickedAreaData) {
        setPopupInfo({
          ...clickedAreaData,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          opacity: 1,
        });
      }
    },
    [data, setPopupInfo]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!map || !e.features?.length) return;

      if (hoveredAreaIdRef.current !== null) {
        map.setFeatureState(
          { source: "areas", id: hoveredAreaIdRef.current },
          { hover: false }
        );
      }
      hoveredAreaIdRef.current = e.features[0].id;
      map.setFeatureState(
        { source: "areas", id: hoveredAreaIdRef.current },
        { hover: true }
      );
    },
    [map]
  );

  const handleMouseLeave = useCallback(() => {
    if (!map) return;
    if (hoveredAreaIdRef.current !== null) {
      map.setFeatureState(
        { source: "areas", id: hoveredAreaIdRef.current },
        { hover: false }
      );
      hoveredAreaIdRef.current = null;
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    map.on("click", "area-fills", handleMapClick);
    map.on("mousemove", "area-fills", handleMouseMove);
    map.on("mouseleave", "area-fills", handleMouseLeave);

    return () => {
      map.off("click", "area-fills", handleMapClick);
      map.off("mousemove", "area-fills", handleMouseMove);
      map.off("mouseleave", "area-fills", handleMouseLeave);
    };
  }, [map, handleMapClick, handleMouseMove, handleMouseLeave]);

  useEffect(() => {
    if (!map || !data.length) return;

    const bounds: LngLatLike[][] = data.map((area) =>
      area.geojson_boundaries.map((pair: string[]) => [
        parseFloat(pair[0]),
        parseFloat(pair[1]),
      ])
    );

    const extremePoints = findExtremeCoordinates(bounds);

    map.fitBounds(extremePoints, {
      padding: { top: 50, bottom: 50, left: 10, right: 10 },
    });
  }, [map, data]);

  return null;
}

export default function MapLibre({ data: surveys }) {
  const [popupInfo, setPopupInfo] = useState(null);

  const { global_x, global_y } = calculateGlobalCenters(surveys);

  const initialViewState = {
    latitude: global_y,
    longitude: global_x,
    zoom: 15,
  };

  return (
    <Map
      initialViewState={initialViewState}
      mapStyle={{
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
          },
          areas: {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: surveys.map((survey) => ({
                type: "Feature",
                properties: {
                  survey_id: survey.id,
                  label: `${survey.access_code}-${survey.area_code}`,
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
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#e5e5e5" },
          },

          { id: "osm", type: "raster", source: "osm" },

          {
            id: "area-fills",
            type: "fill",
            source: "areas",
            paint: {
              "fill-color": "#088",
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.8,
                0.5,
              ],
            },
          },

          {
            id: "area-borders",
            type: "line",
            source: "areas",
            paint: { "line-color": "#088", "line-width": 1.25 },
          },

          {
            id: "area-labels",
            type: "symbol",
            source: "areas",
            layout: {
              "text-field": ["get", "label"],
              "text-size": 14,
              "text-anchor": "center",
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "#088",
              "text-halo-width": 2,
            },
          },
        ],
      }}
    >
      <MapEvents data={surveys} setPopupInfo={setPopupInfo} />
      {popupInfo && (
        <MapPopup popupInfo={popupInfo} setPopupInfo={setPopupInfo} />
      )}
    </Map>
  );
}
