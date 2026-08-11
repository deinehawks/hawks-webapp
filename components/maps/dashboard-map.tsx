"use client";

import { Separator } from "@/components/ui/separator";
import { calculateGlobalCenters, findExtremeCoordinates } from "@/lib/helpers";
import { LngLatLike, Map, Popup, useMap } from "@vis.gl/react-maplibre";
import type { Feature, GeoJsonProperties, Point, Polygon } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Calculate polygon centroid
function calculateCentroid(coordinates: number[][][]) {
  let sumX = 0;
  let sumY = 0;
  const points = coordinates[0]; // First ring of polygon

  for (let i = 0; i < points.length; i++) {
    sumX += points[i][0];
    sumY += points[i][1];
  }

  return [sumX / points.length, sumY / points.length];
}

function MapPopup({ popupInfo, setPopupInfo }: { popupInfo: any; setPopupInfo: (value: any) => void }) {
  return (
    <AnimatePresence mode="wait">
      {popupInfo && (
        <Popup
          key={popupInfo.id}
          anchor="bottom"
          longitude={popupInfo.lng}
          latitude={popupInfo.lat}
          onClose={() => {
            setPopupInfo(null);
          }}
          closeOnClick={false}
          closeOnMove={false}
          maxWidth="none"
        >
          <motion.div
            key={`popup-${popupInfo.id}`}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-xl overflow-hidden shadow-xl border border-border bg-card w-full max-w-85"
          >
            {/* Header */}
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
                    {`${popupInfo.code}-${popupInfo.area_code}`}
                  </div>
                </div>
                <div className="text-xs px-2.5 py-1 bg-primary-foreground/20 text-primary-foreground rounded-md font-medium">
                  #{popupInfo.id}
                </div>
              </div>
            </motion.div>

            {/* Body content */}
            <div className="bg-card px-4 py-3.5 space-y-3">
              {/* Area information */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.11 }}
              >
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Area
                    </span>
                  </div>
                  <span className="text-base font-bold text-foreground">
                    {popupInfo.area.toFixed(2)} ha
                  </span>
                </div>
              </motion.div>

              {/* Additional Details */}
              {(popupInfo.flight_date ||
                popupInfo.location ||
                popupInfo.tags) && (
                <>
                  <Separator />
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-2"
                  >
                    {popupInfo.flight_date && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Flight date
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {popupInfo.flight_date}
                        </span>
                      </div>
                    )}

                    {popupInfo.location && (
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          Location
                        </span>
                        <span
                          className="text-sm font-semibold text-foreground truncate max-w-[180px]"
                          title={popupInfo.location}
                        >
                          {popupInfo.location}
                        </span>
                      </div>
                    )}

                    {popupInfo.tags && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Type
                        </span>
                        <span className="text-xs font-semibold text-foreground uppercase px-2 py-0.5 bg-muted rounded">
                          {popupInfo.tags}
                        </span>
                      </div>
                    )}
                  </motion.div>
                </>
              )}

              {/* View details button */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="pt-1"
              >
                <Link href={`/dashboard/surveys/${popupInfo.id}`}>
                  <button className="w-full px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold shadow-sm">
                    View Details →
                  </button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </Popup>
      )}
    </AnimatePresence>
  );
}

function MapEvents({ data, setPopupInfo }: { data: any[]; setPopupInfo: (value: any) => void }) {
  const { current: map } = useMap();
  const hoveredAreaIdRef = useRef<string | number | null>(null);

  const handleMapClick = useCallback(
    (e: any) => {
      if (!data || !e.features?.length) return;

      const clickedAreaData = data.find(
        (datum: any) => datum.id === e.features[0]?.properties.survey_id,
      );

      if (clickedAreaData) {
        // Calculate the centroid of the clicked polygon
        const coordinates = [
          clickedAreaData.geojson_boundaries.map((pair: string[]) => [
            parseFloat(pair[0]),
            parseFloat(pair[1]),
          ]),
        ];
        const [lng, lat] = calculateCentroid(coordinates);

        setPopupInfo({
          ...clickedAreaData,
          lat: lat,
          lng: lng,
          opacity: 1,
        });

        // Center the map on the polygon's centroid with proper padding
        map?.flyTo({
          center: [lng, lat],
          zoom: Math.max(map.getZoom(), 16),
          padding: { top: 300, bottom: 25, left: 50, right: 50 },
          duration: 800,
        });
      }
    },
    [data, setPopupInfo, map],
  );

  const handleMouseMove = useCallback(
    (e: any) => {
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
        { source: "areas", id: featureId },
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

    const bounds: LngLatLike[][] = data.map((area: any) =>
      area.geojson_boundaries.map((pair: string[]) => [
        parseFloat(pair[0]),
        parseFloat(pair[1]),
      ]),
    );

    const extremePoints = findExtremeCoordinates(bounds);
    if (!extremePoints) return;

    map.fitBounds(extremePoints, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      duration: 1000,
    });
  }, [map, data]);

  return null;
}

export default function MapLibre({ data: surveys }: { data: any[] }) {
  const [popupInfo, setPopupInfo] = useState<any>(null);

  const { global_x, global_y } = calculateGlobalCenters(surveys);

  const initialViewState = {
    latitude: global_y,
    longitude: global_x,
    zoom: 15,
  };

  // Create polygon features
  const polygonFeatures: Feature<Polygon, GeoJsonProperties>[] = surveys.map((survey: any) => {
    const coordinates = [
      survey.geojson_boundaries.map((pair: string[]) => [
        parseFloat(pair[0]),
        parseFloat(pair[1]),
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
  const labelFeatures: Feature<Point, GeoJsonProperties>[] = surveys.map((survey: any) => {
    const coordinates = [
      survey.geojson_boundaries.map((pair: string[]) => [
        parseFloat(pair[0]),
        parseFloat(pair[1]),
      ]),
    ];
    const centroid = calculateCentroid(coordinates);

    return {
      type: "Feature",
      properties: {
        survey_id: survey.id,
        label: `${survey.code}-${survey.area_code}`,
      },
      geometry: {
        type: "Point",
        coordinates: [...centroid] as [number, number],
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
    >
      <MapEvents data={surveys} setPopupInfo={setPopupInfo} />
      {popupInfo && (
        <MapPopup popupInfo={popupInfo} setPopupInfo={setPopupInfo} />
      )}
    </Map>
  );
}
