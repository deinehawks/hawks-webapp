export const three_dimensional_models = [
  {
    code: "pcd-lidar",
    name: "Point Cloud (LiDAR)",
    source: "LiDAR",
    description:
      "LiDAR-derived point clouds are created by actively emitting laser pulses and measuring the time it takes for the reflections to return to the sensor. Each measured return generates a precise 3D point with spatial coordinates, forming a dense and accurate representation of the scanned environment.",
  },
  {
    code: "pcd-odm",
    name: "Point Cloud (Photogrammetry)",
    source: "aerial photographs",
    description:
      "A point cloud derived from aerial imagery is a 3D representation of a scene, composed of a dense set of data points. Each point in the cloud is generated through photogrammetric techniques that analyze overlapping aerial photographs. ",
  },
  // {
  //   code: "glb",
  //   name: "Textured Model",
  //   source: "aerial imagery",
  //   description:
  //     "A textured 3D model from aerial images combines the geometric accuracy of a point cloud with the visual richness of the original photographs. By projecting the colors and textures from the aerial images onto the 3D geometry derived through photogrammetry, a realistic and visually interpretable model is created.",
  // },
];
