"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Bounds, OrbitControls, useBounds } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Quaternion, Vector3 } from "three";
import { getYear } from "date-fns";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import { WorkshopPCDLoader } from "@/lib/loaders/pcd-loader";
import {
  createPointCloudMotion,
  createPointCloudPresentation,
  POINT_CLOUD_RENDERER,
} from "@/lib/three/point-cloud-performance";

type SurveyCloudProps = {
  survey: { id: string | number; code?: string | null; flight_date: string | Date };
};

function FitPointCloud() {
  const bounds = useBounds();
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  // Observe dimensions rather than the size object: Canvas can replace that
  // object on UI updates without resizing. Those updates must preserve the view.
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
  const previousCamera = useMemo(() => ({
    position: new Vector3(Infinity, Infinity, Infinity),
    quaternion: new Quaternion(),
  }), [points]);

  useEffect(() => {
    const controller = createPointCloudMotion(points, invalidate);
    motion.current = controller;
    controller.moving();
    return () => {
      motion.current = null;
      controller.dispose();
    };
  }, [points, invalidate]);

  // OrbitControls updates at priority -1, before this check and the draw.
  // This also covers the initial Bounds fit and fitting after a resize.
  useFrame(({ camera }) => {
    if (previousCamera.position.distanceToSquared(camera.position) > 1e-10 ||
        1 - Math.abs(previousCamera.quaternion.dot(camera.quaternion)) > 1e-10) {
      previousCamera.position.copy(camera.position);
      previousCamera.quaternion.copy(camera.quaternion);
      motion.current?.moving();
    }
  });

  return <primitive object={points} dispose={null} />;
}

export function ThreeDimensionalModel({ survey }: SurveyCloudProps) {
  const selected3dModel = useSurveyMapStore((state) => state.selected3dModel);
  const show3dAxesHelper = useSurveyMapStore((state) => state.show3dAxesHelper);
  const filename = selected3dModel === "pcd-lidar" ? "lidar.pcd" : "odm.pcd";
  const url = `/asimov-hawks/3d/${survey.code?.toLowerCase()}/${getYear(survey.flight_date)}/${survey.id}/${filename}`;

  if (!selected3dModel) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-primary-foreground">
        No 3D available for this survey.
      </div>
    );
  }

  return (
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
        <Bounds key={url}>
          <FitPointCloud />
          <PointCloud url={url} />
        </Bounds>
      </Suspense>
      <OrbitControls makeDefault enableDamping={false} />
      {show3dAxesHelper && <axesHelper args={[150]} />}
    </Canvas>
  );
}
