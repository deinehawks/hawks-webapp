"use client";

import Lottie from "lottie-react";
import loadingAnimation from "@/public/animation_loader.json";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-40">
        <Lottie animationData={loadingAnimation} loop={true} />
      </div>
    </div>
  );
}
