"use client";

import dynamic from "next/dynamic";
import maplibregl from "maplibre-gl";
import { useEffect } from "react";
import { Protocol } from "pmtiles";

export default function DashboardMapCaller(props) {
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
        <div className="justify center flex flex-1 items-center justify-center">
          Loading map...
        </div>
      ),
    }
  );

  return <DashboardMap {...props} />;
}
