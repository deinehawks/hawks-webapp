export const MAP_COLORS = {
  healthy: {
    base: "#ffff00", // yellow-400
    heatmap: "255, 255, 0", // rgb string for heatmap
  },
  unhealthy: {
    base: "#dc2626", // red-600
    heatmap: "255, 0, 0",
  },
  inventory: {
    base: "#06b6d4",
    heatmap: "6, 182, 212",
  },
  boundary: "#0ea5e9", // sky-500
  hover: "#06b6d4", // cyan-500
} as const;

/* export const MAP_COLORS = {
  healthy: {
    base: "#0173B2", // Primary blue
    light: "#0290d9", // Lighter blue for gradients
    dark: "#014a73", // Darker blue for borders
    heatmap: "1, 115, 178", // For heatmaps
  },
  unhealthy: {
    base: "#DE8F05", // Primary orange
    light: "#f5a623", // Lighter orange for gradients
    dark: "#a56b04", // Darker orange for borders
    heatmap: "222, 143, 5",
    // For heatmaps
  },
  boundary: "#8b5cf6", // Keep your existing boundary color
  hover: "#a78bfa", // Keep your existing hover color
} as const; */

export type PlantHealth = "healthy" | "unhealthy" | "inventory";
