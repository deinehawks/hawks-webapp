"use client";

import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import { Bounds, Center, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { getYear } from "date-fns";
import { useEffect, useMemo } from "react";
import {
  AddEquation,
  CustomBlending,
  SrcColorFactor,
  ZeroFactor,
  Vector3,
  Box3,
} from "three";
import { PCDLoader } from "three-stdlib";
import { Points, BufferGeometry } from "three";

function PointCloud(props) {
  const result = useLoader(PCDLoader, props.url);

  const centered = useMemo(() => {
    // PCDLoader always returns a single Points object, cast to fix the type
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

function OdmPointCloud({ survey }) {
  return (
    <Bounds fit={true} clip={true} observe={true}>
      <Center>
        <PointCloud
          url={`/asimov-hawks/3d/${survey.code?.toLowerCase()}/${getYear(
            survey.flight_date,
          )}/${survey.id}/odm.pcd`}
          material-size={0.1}
          material-vertexColors={true}
          material-blending={CustomBlending}
          material-blendingEquation={AddEquation}
          material-blendSrc={SrcColorFactor}
          material-blendDst={ZeroFactor}
        />
      </Center>
    </Bounds>
  );
}

function LidarPointCloud({ survey }) {
  return (
    <Bounds fit={true} clip={true} observe={true}>
      <Center>
        <PointCloud
          url={`/asimov-hawks/3d/${survey.code?.toLowerCase()}/${getYear(
            survey.flight_date,
          )}/${survey.id}/lidar.pcd`}
          material-size={0.1}
          material-vertexColors={true}
          material-blending={CustomBlending}
          material-blendingEquation={AddEquation}
          material-blendSrc={SrcColorFactor}
          material-blendDst={ZeroFactor}
        />
      </Center>
    </Bounds>
  );
}

export function ThreeDimensionalModel({ survey }) {
  const { selected3dModel, show3dAxesHelper } = useSurveyMapStore(
    (state) => state,
  );

  if (!selected3dModel)
    return (
      <div className="flex flex-1 items-center justify-center text-primary-foreground">
        No selected 3D model.
      </div>
    );

  // if (selected3dModel === "pcd-lidar") {
  //   return (
  //     <Canvas
  //       fallback={
  //         <div className="flex flex-1 items-center justify-center">
  //           {" "}
  //           WebGL is not supported.{" "}
  //         </div>
  //       }
  //       className="flex flex-1 items-center justify-center"
  //     >
  //       <Bounds fit={true} clip={true} observe={true}>
  //         <Center>
  //           <PointCloud
  //             url={`/asimov-hawks/3d/${survey.code?.toLowerCase()}/${getYear(
  //               survey.flight_date
  //             )}/${survey.id}/lidar.pcd`}
  //             material-size={0.1}
  //             material-vertexColors={true}
  //             material-blending={CustomBlending}
  //             material-blendingEquation={AddEquation}
  //             material-blendSrc={SrcColorFactor}
  //             material-blendDst={ZeroFactor}
  //           />
  //           <OrbitControls />
  //         </Center>
  //       </Bounds>
  //       {show3dAxesHelper && <axesHelper args={[150]} />}
  //     </Canvas>
  //   );
  // }

  return (
    <Canvas
      // ── Fix: logarithmic depth buffer eliminates z-fighting and
      //    jitter when the camera is close to large-coordinate geometry ──
      gl={{ logarithmicDepthBuffer: true }}
      fallback={
        <div className="flex flex-1 items-center justify-center">
          WebGL is not supported.
        </div>
      }
      className="flex flex-1 items-center justify-center"
    >
      {selected3dModel === "pcd-lidar" && <LidarPointCloud survey={survey} />}
      {selected3dModel === "pcd-odm" && <OdmPointCloud survey={survey} />}
      <OrbitControls />
      {show3dAxesHelper && <axesHelper args={[150]} />}
    </Canvas>
  );
}
