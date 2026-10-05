"use server";

import { loadRecordingSurveys } from "@/lib/recording/surveys";
import { requireRecordingAccount } from "@/lib/recording/context";
import type { ComputerVisionObject } from "@/lib/types";

export async function getAllUserSurveys(clientCode?: string) {
  const surveys = await loadRecordingSurveys();

  if (!clientCode) {
    return surveys;
  }

  return surveys.filter((survey) => {
    // TEMPORARY DEMO COMPATIBILITY:
    // BARBCO2026 is presented as DEMO in the recording UI.
    if (
      survey.code.toUpperCase() === "DEMO" &&
      clientCode.toUpperCase() === "BARBCO2026"
    ) {
      return true;
    }

    return survey.code.toUpperCase() === clientCode.toUpperCase();
  });
}

export async function getObjectDetectionData(
  id?: string,
  clientCode?: string,
): Promise<ComputerVisionObject[]> {
  const { supabase } = await requireRecordingAccount();

  const surveys = (await getAllUserSurveys(clientCode)).filter(
    (survey) => !id || survey.id === id,
  );

  const allowed = new Set(surveys.map((survey) => survey.id));

  const clients = new Map(
    surveys
      .filter((survey) => survey.client)
      .map((survey) => [survey.client!.id, survey.client!]),
  );

  const result: ComputerVisionObject[] = [];

  for (const client of clients.values()) {
    const bucket = supabase.storage.from("detected-objects");

    // TEMPORARY DEMO FIX:
    // The UI client is masked as DEMO,
    // but the real detection JSON is barbco2026.json.
    const detectionClientCode =
      client.code.toUpperCase() === "DEMO"
        ? "barbco2026"
        : client.code.toLowerCase();

    let download = await bucket.download(client.id + "/detections.json");

    if (download.error) {
      download = await bucket.download(detectionClientCode + ".json");
    }

    if (download.error || !download.data) {
      console.warn(
        "Detection data unavailable for client:",
        detectionClientCode,
      );
      continue;
    }

    try {
      const objects: unknown = JSON.parse(await download.data.text());

      if (!Array.isArray(objects)) {
        continue;
      }

      result.push(
        ...objects.filter(
          (item): item is ComputerVisionObject =>
            !!item &&
            typeof item === "object" &&
            typeof item.areaCode === "string" &&
            allowed.has(item.areaCode) &&
            typeof item.label === "string" &&
            typeof item.pairId === "string" &&
            typeof item.areaPairId === "string" &&
            !!item.bbox &&
            [
              "min_lat",
              "min_lon",
              "max_lat",
              "max_lon",
              "cen_lat",
              "cen_lon",
            ].every(
              (key) =>
                typeof item.bbox[key] === "number" &&
                Number.isFinite(item.bbox[key]),
            ),
        ),
      );
    } catch {
      // Missing/invalid detections do not prevent
      // recording the orthomap.
      console.warn(
        "Detection data unavailable for an authorized recording client.",
      );
    }
  }

  return result;
}
