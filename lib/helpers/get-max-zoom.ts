import fs from "fs";

export function getSurveyMaxZoom(tileBasePath: string): number {
  if (!fs.existsSync(tileBasePath)) return 0;

  const zooms = fs
    .readdirSync(tileBasePath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => Number(entry.name))
    .filter(Number.isFinite);

  return zooms.length > 0 ? Math.max(...zooms) : 0;
}
