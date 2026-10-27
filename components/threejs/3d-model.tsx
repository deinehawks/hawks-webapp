"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Bounds, OrbitControls, useBounds } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Quaternion, Vector3 } from "three";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import { WorkshopPCDLoader } from "@/lib/loaders/pcd-loader";
import {
  RECORDING_PCD_MAX_BYTES,
  RECORDING_PCD_MAX_LABEL,
} from "@/lib/recording/limits";
import {
  createPointCloudMotion,
  createPointCloudPresentation,
  POINT_CLOUD_RENDERER,
} from "@/lib/three/point-cloud-performance";

type SurveyCloudProps = {
  survey: {
    recording_clouds: { url: string; bytes: number }[];
  };
};

class CloudErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <p className="p-6">
        Point cloud unavailable. Check authorization and the active manifest.
      </p>
    ) : (
      this.props.children
    );
  }
}

function FitPointCloud() {
  const bounds = useBounds();
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useEffect(() => {
    bounds.refresh().clip().fit();
  }, [bounds, width, height]);

  return null;
}

function PointCloud({ url }: { url: string }) {
  const source = useLoader(WorkshopPCDLoader, url);
  const points = useMemo(() => createPointCloudPresentation(source), [source]);
  const invalidate = useThree((state) => state.invalidate);
  const motion = useRef<ReturnType<typeof createPointCloudMotion> | null>(null);
  const previousCamera = useMemo(
    () => ({
      position: new Vector3(Infinity, Infinity, Infinity),
      quaternion: new Quaternion(),
    }),
    [points],
  );

  useEffect(() => {
    const controller = createPointCloudMotion(points, invalidate);
    motion.current = controller;
    controller.moving();
    return () => {
      motion.current = null;
      controller.dispose();
    };
  }, [points, invalidate]);

  useFrame(({ camera }) => {
    if (
      previousCamera.position.distanceToSquared(camera.position) > 1e-10 ||
      1 - Math.abs(previousCamera.quaternion.dot(camera.quaternion)) > 1e-10
    ) {
      previousCamera.position.copy(camera.position);
      previousCamera.quaternion.copy(camera.quaternion);
      motion.current?.moving();
    }
  });

  return <primitive object={points} dispose={null} />;
}

export function ThreeDimensionalModel({ survey }: SurveyCloudProps) {
  const selected3dModel = useSurveyMapStore((state) => state.selected3dModel);
  const show3dAxesHelper = useSurveyMapStore(
    (state) => state.show3dAxesHelper,
  );
  const cloud =
    survey.recording_clouds.find(
      (model) => model.url === selected3dModel,
    ) ?? survey.recording_clouds[0];

  if (!cloud) {
    return <p className="p-6">No verified point cloud available.</p>;
  }

  if (cloud.bytes > RECORDING_PCD_MAX_BYTES) {
    return (
      <p className="p-6">
        This point cloud exceeds the supported {RECORDING_PCD_MAX_LABEL} loading
        limit.
      </p>
    );
  }

  return (
    <CloudErrorBoundary key={cloud.url}>
      <Canvas
        frameloop="demand"
        dpr={1}
        gl={POINT_CLOUD_RENDERER}
        fallback={
          <div className="flex flex-1 items-center justify-center">
            WebGL is not supported.
          </div>
        }
        className="flex flex-1 items-center justify-center"
      >
        <Suspense fallback={null}>
          <Bounds key={cloud.url}>
            <FitPointCloud />
            <PointCloud url={cloud.url} />
          </Bounds>
        </Suspense>
        <OrbitControls makeDefault enableDamping={false} />
        {show3dAxesHelper && <axesHelper args={[150]} />}
      </Canvas>
    </CloudErrorBoundary>
  );
}
