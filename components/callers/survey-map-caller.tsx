"use client";

import dynamic from "next/dynamic";
import maplibregl from "maplibre-gl";
import { useEffect, type ComponentProps } from "react";
import type SurveyMapComponent from "@/components/maps/survey-map";
import { Protocol } from "pmtiles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/loading_blue_dots.json";

const queryClient = new QueryClient();

export default function SurveyMapCaller(props: ComponentProps<typeof SurveyMapComponent>) {
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
      <div role="status" className="flex h-full flex-1 flex-col items-center justify-center py-10">
        <div aria-hidden="true">
          <Lottie
            animationData={loadingAnimation}
            loop={true}
            style={{ width: 200, height: 200 }}
          />
        </div>
        <p className="text-sm text-muted-foreground">Loading survey map…</p>
      </div>
    ),
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SurveyMap {...props} />
    </QueryClientProvider>
  );
}
