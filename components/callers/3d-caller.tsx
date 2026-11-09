"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ThreeDimensionalModel as ModelComponent } from "@/components/threejs/3d-model";
import { LoaderCircle } from "lucide-react";

const ThreeDimensionalModel = dynamic(
  () =>
    import("@/components/threejs/3d-model").then(
      (mod) => mod.ThreeDimensionalModel
    ),
  {
    ssr: false,
    loading: () => (
      <div role="status" className="flex min-h-80 flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-950 p-6 text-sm text-neutral-200">
        <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
        Loading 3D model…
      </div>
    ),
  }
);

export default function ThreeDimensionalModelCaller(props: ComponentProps<typeof ModelComponent>) {
  return <ThreeDimensionalModel {...props} />;
}
