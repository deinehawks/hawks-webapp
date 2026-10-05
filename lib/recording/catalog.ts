import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { z } from "zod";

const tile = z.object({
  url: z.string().startsWith("/asimov-hawks/tiles/"),
  tileFolder: z.enum(["round-corners", "sharp-corners"]),
  minZoom: z.number().int().min(0).max(24),
  maxZoom: z.number().int().min(0).max(24),
  bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});
const catalogCloud = z.object({
  url: z.string().startsWith("/asimov-hawks/3d/"),
  bytes: z.number().int().positive(),
});
const rawCatalogSchema = z.object({
  version: z.literal(1),
  surveys: z.record(z.object({
    clientCode: z.string(),
    tile: tile.optional(),
    clouds: z.array(catalogCloud),
  })),
});
const outputBindingsSchema = z.object({
  version: z.literal(1),
  surveys: z.record(z.object({
    pointClouds: z.array(z.object({
      outputCode: z.string().min(1),
      url: z.string().startsWith("/asimov-hawks/3d/"),
      decision: z.enum(["preserve-existing-output", "create-output"]),
    })),
  })),
});
type RawCatalog = z.infer<typeof rawCatalogSchema>;
type RecordingCatalog = Omit<RawCatalog, "surveys"> & {
  surveys: Record<string, Omit<RawCatalog["surveys"][string], "clouds"> & {
    clouds: Array<z.infer<typeof catalogCloud> & { outputCode: string }>;
  }>;
};
export const getRecordingSelection = cache(async () => {
  const text = await readFile(path.join(process.cwd(), ".recording/selection.json"), "utf8");
  const selection = z.object({ surveyIds: z.array(z.string().regex(/^AH-\d+$/)).length(58) }).parse(JSON.parse(text));
  if (new Set(selection.surveyIds).size !== 58) throw new Error("Recording selection contains duplicates.");
  return selection.surveyIds;
});
async function readOutputBindings() {
  try {
    return outputBindingsSchema.parse(JSON.parse(
      await readFile(path.join(process.cwd(), ".recording/output-bindings.json"), "utf8"),
    ));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1 as const, surveys: {} };
    }
    throw new Error("Recording output bindings are invalid; rebuild them from the reviewed metadata.", { cause: error });
  }
}

export const getRecordingCatalog = cache(async (): Promise<RecordingCatalog> => {
  try {
    const raw = rawCatalogSchema.parse(JSON.parse(
      await readFile(path.join(process.cwd(), ".recording/catalog.json"), "utf8"),
    ));
    const bindings = await readOutputBindings();
    const surveys = Object.fromEntries(Object.entries(raw.surveys).map(([surveyId, survey]) => {
      const surveyBindings = bindings.surveys[surveyId]?.pointClouds ?? [];
      const outputCodes = new Set<string>();
      const urls = new Set<string>();
      const clouds = surveyBindings.map((binding) => {
        if (outputCodes.has(binding.outputCode) || urls.has(binding.url)) {
          throw new Error(`Duplicate recording output binding for ${surveyId}.`);
        }
        outputCodes.add(binding.outputCode);
        urls.add(binding.url);
        const cloud = survey.clouds.find((candidate) => candidate.url === binding.url);
        if (!cloud) throw new Error(`Recording output binding is not in the verified catalog for ${surveyId}.`);
        return { ...cloud, outputCode: binding.outputCode };
      });
      return [surveyId, { ...survey, clouds }];
    }));
    const unknownSurvey = Object.keys(bindings.surveys).find((surveyId) => !raw.surveys[surveyId]);
    if (unknownSurvey) throw new Error(`Recording output binding references unknown survey ${unknownSurvey}.`);
    return { version: 1, surveys };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1 as const, surveys: {} };
    throw new Error("Recording catalog is invalid; regenerate it from verified reports.", { cause: error });
  }
});
