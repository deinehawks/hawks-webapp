"use client";

import dynamic from "next/dynamic";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/loading_dots_white.json";

type ThreeDimensionalModelCallerProps = {
  survey: {
    id: string;
    code?: string | null;
    flight_date?: string | number | Date | null;
  };
};

export default function ThreeDimensionalModelCaller(
  props: ThreeDimensionalModelCallerProps,
) {
  const ThreeDimensionalModel = dynamic(
    () => import("@/components/threejs/3d-model").then((mod) => mod.ThreeDimensionalModel),
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
    },
  );

  return <ThreeDimensionalModel {...props} />;
}
