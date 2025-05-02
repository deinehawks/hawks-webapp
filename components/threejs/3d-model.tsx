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

function OdmPointCloud({ survey }) {
  return (
    <Bounds fit={true} clip={true} observe={true}>
      <Center>
        <PointCloud
          url={`/asimov-hawks/3d/${survey.code?.toLowerCase()}/${getYear(
            survey.flight_date
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
            survey.flight_date
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
    (state) => state
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
      fallback={
        <div className="flex flex-1 items-center justify-center">
          {" "}
          WebGL is not supported.{" "}
        </div>
      }
      className="flex flex-1 items-center justify-center"
      style={{ width: "100%", height: "100%" }}
    >
      {selected3dModel === "pcd-lidar" && <LidarPointCloud survey={survey} />}
      {selected3dModel === "pcd-odm" && <OdmPointCloud survey={survey} />}
      <OrbitControls />

      {show3dAxesHelper && <axesHelper args={[150]} />}
    </Canvas>
  );
}
