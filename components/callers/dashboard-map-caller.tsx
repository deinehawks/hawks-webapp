"use client";

import dynamic from "next/dynamic";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/loading_blue_dots.json";

export default function DashboardMapCaller(props) {
  // ADD: Validate data before passing to map
  const { data, ...otherProps } = props;

  // Check if data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center h-full py-10">
        <div className="text-center text-muted-foreground">
          <p className="text-sm font-medium">No map data available</p>
        </div>
      </div>
    );
  }

  // ADD: Filter out invalid surveys
  const validData = data.filter(
    (survey) =>
      survey &&
      survey.geojson_boundaries &&
      survey.boundaries &&
      survey.min_x != null &&
      survey.max_x != null &&
      survey.min_y != null &&
      survey.max_y != null
  );

  if (validData.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center h-full py-10">
        <div className="text-center text-muted-foreground">
          <p className="text-sm font-medium">No valid surveys to display</p>
          <p className="text-xs mt-1">Surveys need complete boundary data</p>
        </div>
      </div>
    );
  }

  const DashboardMap = dynamic(
    () => import("@/components/maps/dashboard-map"),
    {
      ssr: false,
      loading: () => (
        <div className="flex flex-1 items-center justify-center h-full py-10">
          <Lottie
            animationData={loadingAnimation}
            loop={true}
            style={{ width: 200, height: 200 }}
          />
        </div>
      ),
    }
  );

  return <DashboardMap data={validData} {...otherProps} />;
}
