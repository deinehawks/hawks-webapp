import fs from "node:fs";
import path from "node:path";

/** Prefer database metadata, then try the known local exports without scanning tiles. */
export function resolveSurveyTileFolder(
  orthoRoot: string,
  preferredFolder?: string | null,
): string {
  const preferred = preferredFolder || "round-corners";
  const safePreferred = !preferred.startsWith(".") && !/[\\/:\x00]/.test(preferred)
    ? preferred : "round-corners";

  for (const folder of new Set([safePreferred, "round-corners", "sharp-corners"])) {
    try {
      if (fs.statSync(path.join(orthoRoot, folder)).isDirectory()) return folder;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
    }
  }

  // Keep the expected location if the dataset has not been installed yet.
  return safePreferred;
}
