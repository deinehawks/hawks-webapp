"use client";
import { Component, Suspense, useMemo, type ReactNode } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { Bounds, Center, OrbitControls } from "@react-three/drei";
import { PCDLoader } from "three-stdlib";
import type { Points } from "three";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import {
  RECORDING_PCD_MAX_BYTES,
  RECORDING_PCD_MAX_LABEL,
} from "@/lib/recording/limits";

class CloudErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p className="p-6">Point cloud unavailable. Check authorization and the active manifest.</p> : this.props.children; }
}
function PointCloud({ url }: { url: string }) {
  const loaded = useLoader(PCDLoader, url) as Points;
  const points = useMemo(() => {
    const object = loaded.clone();
    object.geometry = loaded.geometry.clone();
    object.geometry.center();
    return object;
  }, [loaded]);
  return <primitive object={points} material-size={0.1} material-vertexColors />;
}
export function ThreeDimensionalModel({ survey }: { survey: { recording_clouds: { url: string; bytes: number }[] } }) {
  const { selected3dModel, show3dAxesHelper } = useSurveyMapStore((s) => s);
  const cloud = survey.recording_clouds.find((m) => m.url === selected3dModel) ?? survey.recording_clouds[0];
  if (!cloud) return <p className="p-6">No verified point cloud available.</p>;
  if (cloud.bytes > RECORDING_PCD_MAX_BYTES) {
    return (
      <p className="p-6">
        This point cloud exceeds the supported {RECORDING_PCD_MAX_LABEL} loading limit.
      </p>
    );
  }
  return <CloudErrorBoundary key={cloud.url}><Canvas gl={{ logarithmicDepthBuffer: true }} fallback={<p>WebGL is not supported.</p>}>
    <Suspense fallback={null}><Bounds fit clip observe><Center><PointCloud url={cloud.url} /></Center></Bounds></Suspense>
    <OrbitControls />{show3dAxesHelper && <axesHelper args={[150]} />}
  </Canvas></CloudErrorBoundary>;
}
