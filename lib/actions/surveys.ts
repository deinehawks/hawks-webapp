"use server";

import path from "path";

import {
  AuthorizationError,
  getAuthenticatedUserContext,
  requireAccessibleClientById,
} from "@/lib/auth/user-context";
import type { Tables } from "@/lib/database.types";
import { getSurveyMaxZoom } from "@/lib/helpers/get-max-zoom";
import type {
  Client,
  ComputerVisionObject,
  Ortho,
  PointCloud,
  Survey,
} from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

const SURVEY_SELECT = `
  *,
  client:clients!surveys_client_id_fkey(id, code, name),
  orthos!orthos_survey_id_fkey(*),
  point_clouds!point_clouds_survey_id_fkey(*)
`;

type SurveyQueryRow = Tables<"surveys"> & {
  client: Pick<Client, "id" | "code" | "name"> | null;
  orthos: Ortho[];
  point_clouds: PointCloud[];
};

function isTransientNetworkError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return /fetch failed|ECONNRESET|terminated|network|socket|timed out|timeout/i.test(
    message,
  );
}

function normalizeSurvey(row: SurveyQueryRow): Survey {
  const { orthos, point_clouds, client, ...survey } = row;

  if (!client) {
    throw new Error(`Survey ${row.id} is missing its client relationship.`);
  }

  delete (survey as Partial<SurveyQueryRow>).access_code;
  delete (survey as Partial<SurveyQueryRow>).code;
  delete (survey as Partial<SurveyQueryRow>).organization_code;
  delete (survey as Partial<SurveyQueryRow>).ortho;
  delete (survey as Partial<SurveyQueryRow>).point_cloud;

  return {
    ...survey,
    client,
    code: client.code,
    ortho: orthos.find((item) => item.is_current) ?? null,
    point_cloud: point_clouds.find((item) => item.is_current) ?? null,
  };
}

function isDetectionObject(value: unknown): value is ComputerVisionObject {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ComputerVisionObject>;
  return (
    typeof candidate.label === "string" &&
    typeof candidate.areaCode === "string" &&
    typeof candidate.pairId === "string" &&
    typeof candidate.areaPairId === "string" &&
    !!candidate.bbox &&
    typeof candidate.bbox === "object"
  );
}

export async function getUserSurvey(id: string): Promise<Survey> {
  const { profile } = await getAuthenticatedUserContext();
  const supabase = await createClient();

  let query = supabase
    .from("surveys")
    .select(SURVEY_SELECT)
    .eq("id", id);

  if (profile.role !== "platform_admin") {
    if (!profile.organization_id) {
      throw new AuthorizationError(
        "Your profile is pending organization assignment.",
      );
    }
    query = query.eq("client_id", profile.organization_id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    if (isTransientNetworkError(error)) {
      throw new Error(
        "Survey data is temporarily unavailable. Please try again.",
      );
    }
    throw new Error("Failed to fetch survey data.", { cause: error });
  }

  if (!data) {
    throw new Error("Survey not found or access denied.");
  }

  const survey = normalizeSurvey(data as SurveyQueryRow);

  if (
    profile.role !== "platform_admin" &&
    survey.client_id !== profile.organization_id
  ) {
    throw new AuthorizationError("Access denied to this survey data.");
  }

  return survey;
}

export async function getAllUserSurveys(
  requestedClientId?: string,
): Promise<Survey[]> {
  const { profile } = await getAuthenticatedUserContext();
  const targetClientId = requestedClientId ?? profile.organization_id;

  if (!targetClientId) {
    return [];
  }

  const client = await requireAccessibleClientById(targetClientId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("surveys")
    .select(SURVEY_SELECT)
    .eq("client_id", client.id)
    .order("id");

  if (error) {
    if (isTransientNetworkError(error)) {
      console.error("Survey list fetch failed temporarily:", error.message);
      return [];
    }
    throw new Error("Failed to fetch survey data.", { cause: error });
  }

  const root = path.join(process.cwd(), "public", "tiles");

  return (data as SurveyQueryRow[]).map((row) => {
    const survey = normalizeSurvey(row);
    const flightYear = survey.flight_date
      ? String(new Date(survey.flight_date).getFullYear())
      : "unknown";
    const folderPath = path.join(
      root,
      survey.client.code.toLowerCase(),
      flightYear,
      survey.id,
      "ortho",
      survey.ortho?.tile_folder ?? "round-corners",
    );

    return {
      ...survey,
      max_zoom: getSurveyMaxZoom(folderPath),
    };
  });
}

export async function getObjectDetectionData(
  surveyId?: string,
  requestedClientId?: string,
): Promise<ComputerVisionObject[]> {
  const { profile } = await getAuthenticatedUserContext();
  if (!requestedClientId && !profile.organization_id) {
    return [];
  }

  const client = await requireAccessibleClientById(requestedClientId);
  const supabase = await createClient();
  const bucket = supabase.storage.from("detected-objects");
  const uuidPath = `${client.id}/detections.json`;

  try {
    let { data: detectedObjects, error } = await bucket.download(uuidPath);

    // Compatibility fallback for the observation window. Once the bucket is
    // private, storage RLS intentionally prevents access to this legacy path.
    if (error || !detectedObjects) {
      const legacyResult = await bucket.download(
        `${client.code.toLowerCase()}.json`,
      );
      detectedObjects = legacyResult.data;
      error = legacyResult.error;
    }

    if (error || !detectedObjects) {
      console.error("Object detection JSON unavailable:", error?.message);
      return [];
    }

    const jsonString = await detectedObjects.text();
    if (!jsonString.trim()) return [];

    const parsed: unknown = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];

    const objects = parsed.filter(isDetectionObject);
    return surveyId
      ? objects.filter((object) => object.areaCode === surveyId)
      : objects;
  } catch (error) {
    if (isTransientNetworkError(error)) {
      console.error("Object detection JSON fetch failed temporarily:", error);
      return [];
    }

    console.error("Failed to load object detection JSON:", error);
    return [];
  }
}


