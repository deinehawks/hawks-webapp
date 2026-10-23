"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ThreeDimensionalModel as ModelComponent } from "@/components/threejs/3d-model";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/loading_dots_white.json";

const ThreeDimensionalModel = dynamic(
  () =>
    import("@/components/threejs/3d-model").then(
      (mod) => mod.ThreeDimensionalModel
    ),
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

export default function ThreeDimensionalModelCaller(props: ComponentProps<typeof ModelComponent>) {
  return <ThreeDimensionalModel {...props} />;
}
