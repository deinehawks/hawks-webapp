"use client";

import dynamic from "next/dynamic";
import maplibregl from "maplibre-gl";
import { useEffect } from "react";
import { Protocol } from "pmtiles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
      <div className="justify center flex flex-1 items-center justify-center">
        Loading map...
      </div>
    ),
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SurveyMap {...props} />
    </QueryClientProvider>
  );
}
