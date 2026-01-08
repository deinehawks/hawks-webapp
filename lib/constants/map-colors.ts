export const MAP_COLORS = {
  healthy: {
    base: "#fbbf24", // yellow-400
    heatmap: "251, 192, 45", // rgb string for heatmap
  },
  unhealthy: {
    base: "#dc2626", // red-600
    heatmap: "255, 0, 0",
  },
  boundary: "#0ea5e9", // sky-500
  hover: "#06b6d4", // cyan-500
} as const;

export type PlantHealth = "healthy" | "unhealthy";
