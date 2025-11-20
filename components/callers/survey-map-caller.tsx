"use client";

import dynamic from "next/dynamic";
import maplibregl from "maplibre-gl";
import { useEffect } from "react";
import { Protocol } from "pmtiles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/loading_blue_dots.json";

const queryClient = new QueryClient();

export default function SurveyMapCaller(props) {
  useEffect(() => {
    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  const SurveyMap = dynamic(() => import("@/components/maps/survey-map"), {
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

  return (
    <QueryClientProvider client={queryClient}>
      <SurveyMap {...props} />
    </QueryClientProvider>
  );
}
