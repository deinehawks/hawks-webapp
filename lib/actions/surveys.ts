"use server";

import { normalizeDetectionLabels } from "@/lib/helpers/detection-labels";
import { loadRecordingSurveys } from "@/lib/recording/surveys";
import { requireRecordingAccount } from "@/lib/recording/context";
import type { ComputerVisionObject } from "@/lib/types";
import {
  filterWorkshopDetectionObjects,
  getWorkshopVisibility,
  isWorkshopSurveyVisible,
} from "@/lib/workshop-visibility";

function matchesClientCode(surveyCode: string, clientCode: string) {
  // BARBCO2026 is deliberately presented as DEMO in the recording UI.
  return (
    surveyCode.toUpperCase() === clientCode.toUpperCase() ||
    (surveyCode.toUpperCase() === "DEMO" &&
      clientCode.toUpperCase() === "BARBCO2026")
  );
}

export async function getAllUserSurveys(clientCode?: string) {
  const policy = getWorkshopVisibility();
  const surveys = (await loadRecordingSurveys()).filter((survey) =>
    isWorkshopSurveyVisible(survey.code, survey.id, policy),
  );

  return clientCode
    ? surveys.filter((survey) => matchesClientCode(survey.code, clientCode))
    : surveys;
}

export async function getObjectDetectionData(
  id?: string,
  clientCode?: string,
): Promise<ComputerVisionObject[]> {
  const { supabase } = await requireRecordingAccount();
  const policy = getWorkshopVisibility();
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
    const workshopClientCode =
      client.code.toUpperCase() === "DEMO" ? "BARBCO2026" : client.code;
    const detectionClientCode = workshopClientCode.toLowerCase();
    let download = await bucket.download(`${client.id}/detections.json`);

    if (download.error) {
      download = await bucket.download(`${detectionClientCode}.json`);
    }
    if (download.error || !download.data) {
      console.warn("Detection data unavailable for client:", detectionClientCode);
      continue;
    }

    try {
      const objects: unknown = JSON.parse(await download.data.text());
      if (!Array.isArray(objects)) continue;

      const visible = filterWorkshopDetectionObjects(
        objects,
        workshopClientCode,
        policy,
      );
      const valid = visible.filter(
        (item): item is ComputerVisionObject =>
          !!item &&
          typeof item === "object" &&
          typeof item.areaCode === "string" &&
          allowed.has(item.areaCode) &&
          typeof item.label === "string" &&
          typeof item.pairId === "string" &&
          typeof item.areaPairId === "string" &&
          !!item.bbox &&
          ["min_lat", "min_lon", "max_lat", "max_lon", "cen_lat", "cen_lon"].every(
            (key) =>
              typeof item.bbox[key] === "number" &&
              Number.isFinite(item.bbox[key]),
          ),
      );
      result.push(...normalizeDetectionLabels(valid));
    } catch {
      console.warn(
        "Detection data unavailable for an authorized recording client.",
      );
    }
  }

  return result;
}
