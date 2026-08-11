import fs from "fs";

export function getSurveyMaxZoom(tileBasePath: string): number {
  if (!fs.existsSync(tileBasePath)) return 0;

  const folders = fs.readdirSync(tileBasePath);

  const zooms = folders.map((f) => Number(f)).filter((n) => !isNaN(n));

  return zooms.length > 0 ? Math.max(...zooms) : 0;
}
