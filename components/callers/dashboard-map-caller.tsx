"use client";

import dynamic from "next/dynamic";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/loading_blue_dots.json";

export default function DashboardMapCaller(props) {
  // Optional: PMTiles protocol
  // useEffect(() => {
  //   let protocol = new Protocol();
  //   maplibregl.addProtocol("pmtiles", protocol.tile);
  //   return () => {
  //     maplibregl.removeProtocol("pmtiles");
  //   };
  // }, []);

  const DashboardMap = dynamic(
    () => import("@/components/maps/dashboard-map"),
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

  return <DashboardMap {...props} />;
}
