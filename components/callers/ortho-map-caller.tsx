"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type OrthoMapComponent from "@/components/maps/ortho-map";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/loading_blue_dots.json";

export default function OrthoMapCaller(
  props: ComponentProps<typeof OrthoMapComponent>,
) {
  const { surveys, detectedObjects } = props;

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
      <div role="status" className="flex h-full flex-1 flex-col items-center justify-center py-10">
        <div aria-hidden="true">
          <Lottie
            animationData={loadingAnimation}
            loop={true}
            style={{ width: 200, height: 200 }}
          />
        </div>
        <p className="text-sm text-muted-foreground">Loading orthomap…</p>
      </div>
    ),
  });

  return <OrthoMap {...props} />;
}
