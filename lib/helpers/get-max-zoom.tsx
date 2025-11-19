import fs from "fs";
import path from "path";

export function getSurveyMaxZoom(tileBasePath: string): number {
  if (!fs.existsSync(tileBasePath)) return 0;

  const folders = fs.readdirSync(tileBasePath);

  // Keep only numeric folder names (zoom levels)
  const zooms = folders.map((f) => Number(f)).filter((n) => !isNaN(n));

  return zooms.length > 0 ? Math.max(...zooms) : 0;
}
