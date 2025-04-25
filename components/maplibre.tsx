"use client";

import { Separator } from "@/components/ui/separator";
import {
  calculateGlobalCenters,
  findExtremeCoordinates,
  transformCoordinatesToLonLatFormat,
} from "@/lib/helpers";
import { LngLatLike, Map, Marker, Popup, useMap } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useState } from "react";

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
      </div>
    </Popup>
  );
}

function MapEvents({ data, setPopupInfo }) {
  const { current: map } = useMap();

  let clickedAreaId = null;
  let hoveredAreaId = null;

  const bounds: LngLatLike[][] = data.map((area) => {
    return area.geojson_boundaries.map((pair: string[]) => [
      parseFloat(pair[0]),
      parseFloat(pair[1]),
    ]);
  });

  const extremePoints = findExtremeCoordinates(bounds);

  map?.fitBounds(extremePoints, {
    padding: { top: 50, bottom: 50, left: 10, right: 10 },
  });

  map?.on("click", "area-fills", (e) => {
    console.log(e.features);
    if (e.features?.length && e.features.length > 0) {
      clickedAreaId = e.features?.at(0)?.properties.survey_id;

      const clickedAreaData = data
        .filter((datum) => datum.id === e.features?.at(0)?.properties.survey_id)
        .at(0);

      setPopupInfo({
        ...clickedAreaData,
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
        opacity: 1,
      });
    }
  });

  map?.on("mousemove", "area-fills", (e) => {
    if (e.features?.length > 0) {
      if (hoveredAreaId >= 0) {
        map.setFeatureState(
          {
            source: "areas",
            id: hoveredAreaId,
          },
          { hover: false }
        );
      }
      hoveredAreaId = e.features[0].id;
      map.setFeatureState(
        { source: "areas", id: hoveredAreaId },
        { hover: true }
      );
    }
  });

  map?.on("mouseleave", "area-fills", () => {
    if (hoveredAreaId >= 0) {
      map.setFeatureState(
        { source: "areas", id: hoveredAreaId },
        { hover: false }
      );
    }
    hoveredAreaId = null;
  });

  return null;
}

export default function MapLibre({ data: surveys }) {
  const [popupInfo, setPopupInfo] = useState(null);

  // const global_x = 125.58147596772221;
  // const global_y = 7.0763840759644;

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
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
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
                    latitude: Number((survey.max_y + survey.min_y) / 2),
                    longitude: Number((survey.max_x + survey.min_x) / 2),
                  },
                  geometry: {
                    type: "Polygon",
                    coordinates: [
                      transformCoordinatesToLonLatFormat(survey.boundaries),
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
        ],
      }}
    >
      <MapEvents data={surveys} setPopupInfo={setPopupInfo} />
      {popupInfo && (
        <MapPopup
          initialViewState={initialViewState}
          popupInfo={popupInfo}
          setPopupInfo={setPopupInfo}
        />
      )}
    </Map>
  );
}
