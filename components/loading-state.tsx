"use client";

import { useReducedMotion } from "framer-motion";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/Loading.json";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div role="status" className="flex h-full min-h-48 flex-1 flex-col items-center justify-center gap-2 p-6">
      <div aria-hidden="true" className="w-40 max-w-full">
        <Lottie animationData={loadingAnimation} loop={!reduceMotion} autoplay={!reduceMotion} />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
