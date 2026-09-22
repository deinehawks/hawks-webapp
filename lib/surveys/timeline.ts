import "server-only";

import { getUserAppPreviewData } from "@/lib/admin/user-app-preview";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Tables } from "@/lib/database.types";
import type { Survey } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

export type SurveyTimelineEntry = {
  id: string;
  flightDate: string;
  location: string | null;
  hasOrthomosaic: boolean;
  has3DModel: boolean;
};

export type SurveyTimelineState =
  | { status: "missing-primary-farm"; entries: [] }
  | { status: "missing-flight-date"; entries: [] }
  | { status: "current-only"; entries: SurveyTimelineEntry[] }
  | { status: "ready"; entries: SurveyTimelineEntry[] };

type TimelineSurveyRow = Pick<
  Tables<"surveys">,
  "id" | "flight_date" | "location" | "tags"
> & {
  orthos: Array<Pick<Tables<"orthos">, "is_current">>;
  point_clouds: Array<Pick<Tables<"point_clouds">, "is_current">>;
};

function supports3D(
  tags: Tables<"surveys">["tags"],
  hasCurrentPointCloud: boolean,
): boolean {
  const normalizedTags = tags?.join(" ").toLowerCase() ?? "";
  return (
    hasCurrentPointCloud ||
    normalizedTags.includes("rgb") ||
    normalizedTags.includes("lidar")
  );
}

function entryFromSurvey(survey: Survey): SurveyTimelineEntry | null {
  if (!survey.flight_date) return null;

  return {
    id: survey.id,
    flightDate: survey.flight_date,
    location: survey.location,
    hasOrthomosaic: survey.ortho !== null,
    has3DModel: supports3D(survey.tags, survey.point_cloud !== null),
  };
}

function entryFromRow(row: TimelineSurveyRow): SurveyTimelineEntry | null {
  if (!row.flight_date) return null;

  const hasCurrentPointCloud = row.point_clouds.some(
    (pointCloud) => pointCloud.is_current,
  );

  return {
    id: row.id,
    flightDate: row.flight_date,
    location: row.location,
    hasOrthomosaic: row.orthos.some((ortho) => ortho.is_current),
    has3DModel: supports3D(row.tags, hasCurrentPointCloud),
  };
}

function finalizeTimeline(
  currentSurvey: Survey,
  entries: SurveyTimelineEntry[],
): SurveyTimelineState {
  if (!currentSurvey.flight_date) {
    return { status: "missing-flight-date", entries: [] };
  }

  const uniqueEntries = new Map(entries.map((entry) => [entry.id, entry]));
  const currentEntry = entryFromSurvey(currentSurvey);
  if (currentEntry) uniqueEntries.set(currentEntry.id, currentEntry);

  const sortedEntries = [...uniqueEntries.values()].sort((left, right) => {
    const dateOrder = right.flightDate.localeCompare(left.flightDate);
    return dateOrder || left.id.localeCompare(right.id);
  });

  return sortedEntries.length <= 1
    ? { status: "current-only", entries: sortedEntries }
    : { status: "ready", entries: sortedEntries };
}

export async function getAccessibleSurveyTimeline(
  currentSurvey: Survey,
): Promise<SurveyTimelineState> {
  await getAuthenticatedUserContext();
  const supabase = await createClient();

  const { data: currentLink, error: currentLinkError } = await supabase
    .from("survey_farms")
    .select("farm_id")
    .eq("survey_id", currentSurvey.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (currentLinkError) {
    throw new Error("Failed to load the survey timeline relationship.", {
      cause: currentLinkError,
    });
  }
  if (!currentLink) {
    return { status: "missing-primary-farm", entries: [] };
  }
  if (!currentSurvey.flight_date) {
    return { status: "missing-flight-date", entries: [] };
  }

  const { data: siblingLinks, error: siblingLinksError } = await supabase
    .from("survey_farms")
    .select("survey_id")
    .eq("farm_id", currentLink.farm_id)
    .eq("is_primary", true);

  if (siblingLinksError) {
    throw new Error("Failed to load related timeline surveys.", {
      cause: siblingLinksError,
    });
  }

  const surveyIds = [...new Set((siblingLinks ?? []).map((link) => link.survey_id))];
  if (surveyIds.length === 0) {
    return finalizeTimeline(currentSurvey, []);
  }

  const { data: surveyRows, error: surveyRowsError } = await supabase
    .from("surveys")
    .select(
      `
        id,
        flight_date,
        location,
        tags,
        orthos!orthos_survey_id_fkey(is_current),
        point_clouds!point_clouds_survey_id_fkey(is_current)
      `,
    )
    .in("id", surveyIds)
    .not("flight_date", "is", null);

  if (surveyRowsError) {
    throw new Error("Failed to load timeline survey details.", {
      cause: surveyRowsError,
    });
  }

  const entries = ((surveyRows ?? []) as TimelineSurveyRow[])
    .map(entryFromRow)
    .filter((entry): entry is SurveyTimelineEntry => entry !== null);

  return finalizeTimeline(currentSurvey, entries);
}

export async function getUserAppPreviewSurveyTimeline(
  profileId: string,
  currentSurveyId: string,
): Promise<SurveyTimelineState | null> {
  const preview = await getUserAppPreviewData(profileId);
  const currentSurvey = preview.surveys.find(
    (survey) => survey.id === currentSurveyId,
  );
  if (preview.status !== "active" || !currentSurvey) return null;

  const supabase = await createClient();
  const allowedSurveyIds = preview.surveys.map((survey) => survey.id);
  if (allowedSurveyIds.length === 0) {
    return { status: "missing-primary-farm", entries: [] };
  }

  const { data: primaryLinks, error: primaryLinksError } = await supabase
    .from("survey_farms")
    .select("survey_id, farm_id")
    .in("survey_id", allowedSurveyIds)
    .eq("is_primary", true);

  if (primaryLinksError) {
    throw new Error("Failed to load preview timeline relationships.", {
      cause: primaryLinksError,
    });
  }

  const currentLink = (primaryLinks ?? []).find(
    (link) => link.survey_id === currentSurvey.id,
  );
  if (!currentLink) {
    return { status: "missing-primary-farm", entries: [] };
  }
  if (!currentSurvey.flight_date) {
    return { status: "missing-flight-date", entries: [] };
  }

  const sameFarmSurveyIds = new Set(
    (primaryLinks ?? [])
      .filter((link) => link.farm_id === currentLink.farm_id)
      .map((link) => link.survey_id),
  );
  const entries = preview.surveys
    .filter((survey) => sameFarmSurveyIds.has(survey.id))
    .map(entryFromSurvey)
    .filter((entry): entry is SurveyTimelineEntry => entry !== null);

  return finalizeTimeline(currentSurvey, entries);
}
