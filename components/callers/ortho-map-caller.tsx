"use client";

import type { ComputerVisionObject } from "@/lib/types";
import dynamic from "next/dynamic";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/loading_blue_dots.json";

type OrthoSurvey = {
  id: string | number;
  code?: string | null;
  flight_date?: string | Date | null;
};

type OrthoMapCallerProps = {
  userProfile: unknown;
  surveys: OrthoSurvey[];
  detectedObjects: ComputerVisionObject[];
} & Record<string, unknown>;

export default function OrthoMapCaller(props: OrthoMapCallerProps) {
  const { surveys, detectedObjects } = props;

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
