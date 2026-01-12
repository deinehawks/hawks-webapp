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
      "A point cloud created from aerial images is a collection of small points that together show the shape of the land or objects on it. These points are produced by carefully analyzing multiple photos taken from above, allowing the system to represent the area in three dimensions.",
  },
  {
    code: "glb",
    name: "Textured Model",
    source: "aerial imagery",
    description:
      "A point cloud created from aerial images is a collection of many small points that together show the shape of the land or objects on it. These points are produced by carefully analyzing multiple photos taken from above, allowing the system to represent the area in three dimensions.",
  },
];
