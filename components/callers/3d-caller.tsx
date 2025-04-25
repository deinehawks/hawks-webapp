"use client";

import dynamic from "next/dynamic";

export default function ThreeDimensionalModelCaller(props) {
  const ThreeDimensionalModel = dynamic(
    () =>
      import("@/components/threejs/3d-model").then(
        (mod) => mod.ThreeDimensionalModel
      ),
    {
      ssr: false,
      loading: () => (
        <div className="justify center flex flex-1 items-center justify-center text-primary-foreground">
          Loading 3D model...
        </div>
      ),
    }
  );

  return <ThreeDimensionalModel {...props} />;
}
