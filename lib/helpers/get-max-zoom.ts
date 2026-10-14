import fs from "fs";

export function getSurveyMaxZoom(tileBasePath: string): number {
  if (!fs.existsSync(tileBasePath)) return 0;

  const folders = fs.readdirSync(tileBasePath, { withFileTypes: true });

  // Keep only numeric folder names (zoom levels)
  const zooms = folders
    .filter((folder) => folder.isDirectory() && /^\d+$/.test(folder.name))
    .map((folder) => Number(folder.name));

  return zooms.length > 0 ? Math.max(...zooms) : 0;
}
