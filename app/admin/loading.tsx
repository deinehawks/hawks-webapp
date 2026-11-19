"use client";

import Lottie from "lottie-react";

import loadingAnimation from "@/public/Loading.json";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-50">
        <Lottie animationData={loadingAnimation} loop={true} />
      </div>
    </div>
  );
}
