import "server-only";

import path from "path";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import type { Tables } from "@/lib/database.types";
import { getSurveyMaxZoom } from "@/lib/helpers/get-max-zoom";
import type { Client, ComputerVisionObject, Ortho, PointCloud, Survey, UserProfile } from "@/lib/types";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import { createClient } from "@/utils/supabase/server";

const SURVEY_SELECT = `*, client:clients!surveys_client_id_fkey(id, code, name),
  orthos!orthos_survey_id_fkey(*), point_clouds!point_clouds_survey_id_fkey(*)`;

type PreviewStatus = "active" | "account-inactive" | "platform-admin";
type MembershipRow = {
  organization_id: string; role: string; status: string;
  organization: { id: string; status: string } | null;
};
type SurveyGrantRow = {
  survey_id: string; organization_id: string | null;
  status: string; expires_at: string | null;
};
type ClientOrganizationRow = { client_id: string; organization_id: string };
type SurveyOrganizationRow = { survey_id: string; organization_id: string };
type SurveyQueryRow = Tables<"surveys"> & {
  client: Pick<Client, "id" | "code" | "name"> | null;
  orthos: Ortho[]; point_clouds: PointCloud[];
};

export type UserAppPreviewData = {
  profile: UserProfile; status: PreviewStatus; surveys: Survey[];
  detectedObjects: ComputerVisionObject[];
};

function normalizeProfile(profile: Tables<"profiles">): UserProfile {
  const normalized = { ...profile } as Partial<Tables<"profiles">>;
  delete normalized.access_code;
  delete normalized.organization;
  return normalized as UserProfile;
}

function normalizeSurvey(row: SurveyQueryRow): Survey | null {
  const { orthos, point_clouds, client, ...survey } = row;
  if (!client) return null;
  delete (survey as Partial<SurveyQueryRow>).access_code;
  delete (survey as Partial<SurveyQueryRow>).code;
  delete (survey as Partial<SurveyQueryRow>).organization_code;
  delete (survey as Partial<SurveyQueryRow>).ortho;
  delete (survey as Partial<SurveyQueryRow>).point_cloud;
  const flightYear = survey.flight_date
    ? String(new Date(survey.flight_date).getFullYear()) : "unknown";
  const currentOrtho = orthos.find((item) => item.is_current) ?? null;
  const folderPath = path.join(process.cwd(), "public", "tiles",
    client.code.toLowerCase(), flightYear, survey.id, "ortho",
    currentOrtho?.tile_folder ?? "round-corners");
  return {
    ...survey, client, code: client.code, ortho: currentOrtho,
    point_cloud: point_clouds.find((item) => item.is_current) ?? null,
    max_zoom: getSurveyMaxZoom(folderPath),
  };
}

function isDetectionObject(value: unknown): value is ComputerVisionObject {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ComputerVisionObject>;
  return typeof item.label === "string" && typeof item.areaCode === "string" &&
    typeof item.pairId === "string" && typeof item.areaPairId === "string" &&
    !!item.bbox && typeof item.bbox === "object";
}

export const getUserAppPreviewProfile = cache(async (profileId: string) => {
  const { profile: actor } = await getAuthenticatedUserContext();
  if (actor.role !== "platform_admin") redirect("/dashboard");
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*")
    .eq("id", profileId).maybeSingle();
  if (error) throw new Error("Failed to load the preview account.", { cause: error });
  if (!data) notFound();
  return normalizeProfile(data as Tables<"profiles">);
});

async function loadDetectedObjects(surveys: Survey[]) {
  if (surveys.length === 0) return [];
  const supabase = await createClient();
  const bucket = supabase.storage.from("detected-objects");
  const clients = new Map(surveys.map((survey) => [survey.client.id, survey.client] as const));
  const surveyIds = new Set(surveys.map((survey) => survey.id));
  const groups = await Promise.all([...clients.values()].map(async (client) => {
    let result = await bucket.download(`${client.id}/detections.json`);
    if (result.error || !result.data) {
      result = await bucket.download(`${client.code.toLowerCase()}.json`);
    }
    if (result.error || !result.data) return [];
    try {
      const parsed: unknown = JSON.parse(await result.data.text());
      return Array.isArray(parsed) ? parsed.filter(isDetectionObject) : [];
    } catch {
      return [];
    }
  }));
  return groups.flat().filter((object) => surveyIds.has(object.areaCode));
}

export const getUserAppPreviewData = cache(
  async (profileId: string): Promise<UserAppPreviewData> => {
    const profile = await getUserAppPreviewProfile(profileId);
    if (profile.role === "platform_admin") {
      return { profile, status: "platform-admin", surveys: [], detectedObjects: [] };
    }
    if (profile.account_status && profile.account_status !== "active") {
      return { profile, status: "account-inactive", surveys: [], detectedObjects: [] };
    }

    const supabase = await createClient();
    const [membershipsResult, grantsResult, clientOrgsResult, surveyOrgsResult, surveysResult] =
      await Promise.all([
        supabase.from("organization_memberships")
          .select("organization_id, role, status, organization:organizations!organization_memberships_organization_id_fkey(id, status)")
          .eq("profile_id", profileId),
        supabase.from("survey_access_grants")
          .select("survey_id, organization_id, status, expires_at")
          .eq("profile_id", profileId),
        supabase.from("client_organizations").select("client_id, organization_id")
          .eq("review_status", "confirmed"),
        supabase.from("survey_organizations").select("survey_id, organization_id")
          .eq("review_status", "confirmed"),
        supabase.from("surveys").select(SURVEY_SELECT).order("id"),
      ]);

    const failure = [
      ["memberships", membershipsResult.error], ["survey grants", grantsResult.error],
      ["client mappings", clientOrgsResult.error], ["survey mappings", surveyOrgsResult.error],
      ["surveys", surveysResult.error],
    ].find(([, error]) => error);
    if (failure) {
      throw new Error(`Failed to load ${failure[0]} for User App Preview.`, {
        cause: failure[1],
      });
    }

    const memberships = (membershipsResult.data ?? []) as MembershipRow[];
    const grants = (grantsResult.data ?? []) as SurveyGrantRow[];
    const clientOrgs = (clientOrgsResult.data ?? []) as ClientOrganizationRow[];
    const surveyOrgs = (surveyOrgsResult.data ?? []) as SurveyOrganizationRow[];
    const surveyRows = (surveysResult.data ?? []) as SurveyQueryRow[];

    const activeOrgIds = new Set(memberships.filter((membership) =>
      membership.status === "active" && membership.organization?.status === "active")
      .map((membership) => membership.organization_id));
    const adminOrgIds = new Set(memberships.filter((membership) =>
      membership.status === "active" && membership.role === "org_admin" &&
      membership.organization?.status === "active")
      .map((membership) => membership.organization_id));
    const confirmedSurveyOrgs = new Set(surveyOrgs.map((row) =>
      `${row.survey_id}:${row.organization_id}`));
    const adminClientIds = new Set(clientOrgs
      .filter((row) => adminOrgIds.has(row.organization_id))
      .map((row) => row.client_id));
    const visibleSurveyIds = new Set<string>();

    for (const survey of surveyRows) {
      if (survey.id && survey.client_id && adminClientIds.has(survey.client_id)) {
        visibleSurveyIds.add(survey.id);
      }
    }
    for (const mapping of surveyOrgs) {
      if (adminOrgIds.has(mapping.organization_id)) visibleSurveyIds.add(mapping.survey_id);
    }
    const now = Date.now();
    for (const grant of grants) {
      const current = grant.status === "active" &&
        (!grant.expires_at || new Date(grant.expires_at).getTime() > now);
      const organizationScopeIsValid = grant.organization_id === null ||
        (activeOrgIds.has(grant.organization_id) &&
          confirmedSurveyOrgs.has(`${grant.survey_id}:${grant.organization_id}`));
      if (current && organizationScopeIsValid) visibleSurveyIds.add(grant.survey_id);
    }

    const surveys = surveyRows.filter((row) => visibleSurveyIds.has(row.id))
      .map(normalizeSurvey).filter((survey): survey is Survey => survey !== null);
    const detectedObjects = await loadDetectedObjects(surveys);
    return { profile, status: "active", surveys, detectedObjects };
  },
);
