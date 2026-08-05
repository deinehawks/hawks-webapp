"use client";

import { buildPointCloudAssetUrl } from "@/lib/assets/asset-urls";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import { Bounds, Center, OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { getYear } from "date-fns";
import { Component, ReactNode, useEffect, useMemo, useState } from "react";
import {
  AddEquation,
  BufferGeometry,
  CustomBlending,
  Points,
  SrcColorFactor,
  Vector3,
  ZeroFactor,
} from "three";
import { PCDLoader } from "three-stdlib";

const POINT_CLOUD_SIZE_LIMIT_BYTES = 1024 * 1024 * 1024;
const POINT_CLOUD_LIMIT_MESSAGE =
  "This point cloud exceeds the supported loading limit.";

type SurveyPointCloudModel = {
  id: string;
  code?: string | null;
  flight_date?: string | number | Date | null;
};

type PointCloudProps = {
  url: string;
  [key: string]: unknown;
};

type PointCloudPreflightState =
  | { status: "checking" }
  | { status: "ready" }
  | { status: "oversized" }
  | { status: "failed" };

function getSurveyYear(survey: SurveyPointCloudModel): number {
  if (!survey.flight_date) return new Date().getFullYear();
  return getYear(new Date(survey.flight_date));
}

function PointCloudFallback({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-75 flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

class PointCloudErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.info("point_cloud_load_failed", { error });
  }

  render() {
    if (this.state.hasError) {
      return <PointCloudFallback message="This point cloud cannot be loaded right now." />;
    }

    return this.props.children;
  }
}

function PointCloud(props: PointCloudProps) {
  const result = useLoader(PCDLoader, props.url);

  const centered = useMemo(() => {
    const points = (
      Array.isArray(result) ? result[0] : result
    ) as Points<BufferGeometry>;

    points.geometry.computeBoundingBox();
    const box = points.geometry.boundingBox;
    if (!box) return points;

    const center = new Vector3();
    box.getCenter(center);
    points.geometry.translate(-center.x, -center.y, -center.z);

    return points;
  }, [result]);

  return <primitive object={centered} {...props} />;
}

function PointCloudPreflight({
  children,
  url,
}: {
  children: ReactNode;
  url: string;
}) {
  const [state, setState] = useState<PointCloudPreflightState>({
    status: "checking",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function checkPointCloudSize() {
      try {
        const response = await fetch(url, {
          method: "HEAD",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          setState({ status: "failed" });
          return;
        }

        const contentLength = response.headers.get("content-length");
        const byteLength = contentLength ? Number(contentLength) : null;

        if (
          byteLength !== null &&
          Number.isFinite(byteLength) &&
          byteLength > POINT_CLOUD_SIZE_LIMIT_BYTES
        ) {
          setState({ status: "oversized" });
          return;
        }

        setState({ status: "ready" });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.info("point_cloud_preflight_failed", { error, url });
          setState({ status: "failed" });
        }
      }
    }

    checkPointCloudSize();

    return () => controller.abort();
  }, [url]);

  if (state.status === "checking") {
    return <PointCloudFallback message="Checking point cloud size..." />;
  }

  if (state.status === "oversized") {
    return <PointCloudFallback message={POINT_CLOUD_LIMIT_MESSAGE} />;
  }

  if (state.status === "failed") {
    return <PointCloudFallback message="This point cloud cannot be loaded right now." />;
  }

  return <>{children}</>;
}

function ProtectedPointCloud({
  survey,
  fileName,
}: {
  survey: SurveyPointCloudModel;
  fileName: "odm.pcd" | "lidar.pcd";
}) {
  const url = buildPointCloudAssetUrl({
    clientCode: survey.code ?? "",
    fileName,
    surveyId: survey.id,
    year: getSurveyYear(survey),
  });

  return (
    <PointCloudErrorBoundary>
      <PointCloudPreflight url={url}>
        <Bounds fit={true} clip={true} observe={true}>
          <Center>
            <PointCloud
              url={url}
              material-size={0.1}
              material-vertexColors={true}
              material-blending={CustomBlending}
              material-blendingEquation={AddEquation}
              material-blendSrc={SrcColorFactor}
              material-blendDst={ZeroFactor}
            />
          </Center>
        </Bounds>
      </PointCloudPreflight>
    </PointCloudErrorBoundary>
  );
}

function OdmPointCloud({ survey }: { survey: SurveyPointCloudModel }) {
  return <ProtectedPointCloud survey={survey} fileName="odm.pcd" />;
}

function LidarPointCloud({ survey }: { survey: SurveyPointCloudModel }) {
  return <ProtectedPointCloud survey={survey} fileName="lidar.pcd" />;
}

export function ThreeDimensionalModel({
  survey,
}: {
  survey: SurveyPointCloudModel;
}) {
  const { selected3dModel, show3dAxesHelper } = useSurveyMapStore(
    (state) => state,
  );

  if (!selected3dModel) {
    return <PointCloudFallback message="No selected 3D model." />;
  }

  return (
    <Canvas
      gl={{ logarithmicDepthBuffer: true }}
      fallback={<PointCloudFallback message="WebGL is not supported." />}
      className="flex flex-1 items-center justify-center"
    >
      {selected3dModel === "pcd-lidar" && <LidarPointCloud survey={survey} />}
      {selected3dModel === "pcd-odm" && <OdmPointCloud survey={survey} />}
      {selected3dModel === "pcd" && <OdmPointCloud survey={survey} />}
      <OrbitControls />
      {show3dAxesHelper && <axesHelper args={[150]} />}
    </Canvas>
  );
}
