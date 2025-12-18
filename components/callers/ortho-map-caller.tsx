"use client";

import dynamic from "next/dynamic";
import maplibregl from "maplibre-gl";
import { useEffect } from "react";
import { Protocol } from "pmtiles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/loading_blue_dots.json";

const queryClient = new QueryClient();

export default function OrthoMapCaller(props) {
  const { surveys, detectedObjects, userProfile } = props;

  // Add validation checks
  if (!surveys || !Array.isArray(surveys) || surveys.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center h-full py-10">
        <div className="text-center">
          <p className="text-muted-foreground">No survey data available</p>
        </div>
      </div>
    );
  }

  if (!detectedObjects || !Array.isArray(detectedObjects)) {
    return (
      <div className="flex flex-1 items-center justify-center h-full py-10">
        <div className="text-center">
          <p className="text-muted-foreground">No detected objects available</p>
        </div>
      </div>
    );
  }

  const OrthoMap = dynamic(() => import("@/components/maps/ortho-map"), {
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
  });

  return <OrthoMap {...props} />;
}
