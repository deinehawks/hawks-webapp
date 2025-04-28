"use client";

import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import {
  Bounds,
  Center,
  Gltf,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { Canvas, invalidate, useLoader } from "@react-three/fiber";
import { getYear } from "date-fns";
import { useEffect } from "react";
import { AddEquation, CustomBlending, SrcColorFactor, ZeroFactor } from "three";
import { GLTFLoader, PCDLoader } from "three-stdlib";

function PointCloud(props) {
  const points = useLoader(PCDLoader, props.url);
  return <primitive object={points} {...props} />;
}

export function ThreeDimensionalModel({ survey }) {
  const { selected3dModel, show3dAxesHelper } = useSurveyMapStore(
    (state) => state
  );

  if (!selected3dModel)
    return (
      <div className="flex flex-1 items-center justify-center text-primary-foreground">
        No selected 3D model.
      </div>
    );

  return (
    <Canvas
      fallback={
        <div className="flex flex-1 items-center justify-center">
          {" "}
          WebGL is not supported.{" "}
        </div>
      }
    >
      <Bounds fit={true} clip={true} observe={true}>
        <Center>
          {/* {selected3dModel === "pcd-lidar" && (
            <PointCloud
              url="/3d/odm_0.25D.pcd"
              material-size={0.1}
              material-vertexColors={true}
              material-blending={CustomBlending}
              material-blendingEquation={AddEquation}
              material-blendSrc={SrcColorFactor}
              material-blendDst={ZeroFactor}
            />
          )} */}
          {selected3dModel === "pcd-odm" && (
            <PointCloud
              url={`/3d/${survey.code?.toLowerCase()}/${getYear(
                survey.flight_date
              )}/${survey.id}/odm.pcd`}
              material-size={0.1}
              material-vertexColors={true}
              material-blending={CustomBlending}
              material-blendingEquation={AddEquation}
              material-blendSrc={SrcColorFactor}
              material-blendDst={ZeroFactor}
            />
          )}

          <OrbitControls />
        </Center>
      </Bounds>
      {show3dAxesHelper && <axesHelper args={[150]} />}
    </Canvas>
  );
}
