"use client";

import { Layer, Source } from "@vis.gl/react-maplibre";
import type { FeatureCollection, Point } from "geojson";
import { createHeatmapPaint } from "@/lib/constants/map-heatmap";
import { createPinLayout } from "@/lib/constants/map-layers";

export function InventoryLayers({ id, data, zoomLevels }: {
  id: string;
  data: FeatureCollection<Point>;
  zoomLevels: { heatmapMaxZoom: number; pinMinZoom: number };
}) {
  const hasCoconut = data.features.some(feature => feature.properties?.plantType === "coconut");
  return <>
    <Source id={`${id}-inventory`} type="geojson" data={data}>
      <Layer id={`${id}-inventory-heatmap`} type="heatmap" maxzoom={zoomLevels.heatmapMaxZoom}
        filter={["!=", ["get", "plantType"], "coconut"]} paint={createHeatmapPaint("inventory")} />
      {hasCoconut && <Layer id={`${id}-coconut-heatmap`} type="heatmap" maxzoom={zoomLevels.heatmapMaxZoom}
        filter={["==", ["get", "plantType"], "coconut"]} paint={createHeatmapPaint("coconut")} />}
    </Source>
    <Source id={`${id}-inventory-pins`} type="geojson" data={data}>
      <Layer id={`${id}-inventory-pin`} type="symbol" minzoom={zoomLevels.pinMinZoom}
        layout={{ ...createPinLayout("pin-gray"), "icon-image": ["match", ["get", "plantType"], "coconut", "pin-coconut", "pin-gray"] }}
        paint={{ "icon-opacity": 0.9 }} />
    </Source>
  </>;
}
