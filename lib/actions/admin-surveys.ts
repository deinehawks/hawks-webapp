"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Database, Tables, TablesInsert } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type MissionStatus = Database["public"]["Enums"]["mission_status"];
type RelationshipType = Database["public"]["Enums"]["domain_relationship_type"];

type SurveyFarmInsertTable = {
  insert(values: TablesInsert<"survey_farms">): PromiseLike<{ error: PostgrestError | null }>;
};

type SurveyOrganizationInsertTable = {
  insert(values: TablesInsert<"survey_organizations">): PromiseLike<{ error: PostgrestError | null }>;
};

const missionStatuses = ["draft", "processing", "completed", "archived"] as const satisfies readonly MissionStatus[];
const relationshipTypes = ["owner", "operator", "representative", "contact", "member", "requester", "participant", "legacy_client", "other"] as const satisfies readonly RelationshipType[];

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) throw new Error("Missing required survey field.");
  return value.trim();
}

function readOptionalString(formData: FormData, key: string, maxLength = 2000): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, maxLength) : null;
}

function readOptionalNumber(formData: FormData, key: string): number | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Invalid survey numeric value.");
  return parsed;
}

function readBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function parseMissionStatus(value: string): MissionStatus {
  if ((missionStatuses as readonly string[]).includes(value)) return value as MissionStatus;
  throw new Error("Invalid survey status.");
}

function parseRelationshipType(value: string): RelationshipType {
  if ((relationshipTypes as readonly string[]).includes(value)) return value as RelationshipType;
  throw new Error("Invalid survey relationship type.");
}

async function assertPlatformAdmin() {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin") throw new Error("Only platform admins can manage surveys.");
  return profile;
}

function readSurveyPayload(formData: FormData) {
  return {
    survey_status: parseMissionStatus(readRequiredString(formData, "status")),
    survey_location: readOptionalString(formData, "location", 200) ?? undefined,
    survey_area_code: readOptionalString(formData, "areaCode", 80) ?? undefined,
    survey_area: readOptionalNumber(formData, "area") ?? undefined,
    survey_type: readOptionalString(formData, "type", 80) ?? undefined,
    survey_category: readOptionalString(formData, "category", 80) ?? undefined,
    survey_flight_date: readOptionalString(formData, "flightDate", 40) ?? undefined,
  };
}

export async function updateSurvey(formData: FormData) {
  await assertPlatformAdmin();
  const surveyId = readRequiredString(formData, "surveyId");
  const payload = readSurveyPayload(formData);
  const supabase = await createClient();

  const { error } = await supabase.rpc("platform_admin_update_survey", {
    survey_id: surveyId,
    ...payload,
  });
  if (error) throw new Error("Failed to update survey.", { cause: error });

  revalidatePath("/admin");
  revalidatePath("/admin/surveys");
  revalidatePath(`/admin/surveys/${surveyId}`);
}

export async function linkSurveyFarm(formData: FormData) {
  const actor = await assertPlatformAdmin();
  const surveyId = readRequiredString(formData, "surveyId");
  const farmId = readRequiredString(formData, "farmId");
  const relationshipType = parseRelationshipType(readRequiredString(formData, "relationshipType"));
  const areaCoveredHectares = readOptionalNumber(formData, "areaCoveredHectares");
  const notes = readOptionalString(formData, "relationshipNotes");
  const isPrimary = readBoolean(formData, "isPrimary");
  const supabase = await createClient();

  const [surveyResponse, farmResponse, existingResponse] = await Promise.all([
    supabase.from("surveys").select("id").eq("id", surveyId).maybeSingle(),
    supabase.from("farms").select("id, status").eq("id", farmId).maybeSingle(),
    supabase.from("survey_farms").select("survey_id, farm_id").eq("survey_id", surveyId).eq("farm_id", farmId).limit(1),
  ]);
  if (surveyResponse.error) throw new Error("Failed to verify survey.", { cause: surveyResponse.error });
  if (!surveyResponse.data) throw new Error("Survey not found.");
  if (farmResponse.error) throw new Error("Failed to verify farm.", { cause: farmResponse.error });
  if (!farmResponse.data) throw new Error("Farm not found.");
  const farm = farmResponse.data as Pick<Tables<"farms">, "id" | "status">;
  if (farm.status !== "active") throw new Error("Only active farms can be linked to surveys.");
  if (existingResponse.error) throw new Error("Failed to check existing survey farm link.", { cause: existingResponse.error });
  if ((existingResponse.data ?? []).length > 0) throw new Error("This survey is already linked to that farm.");

  const linksTable = supabase.from("survey_farms") as unknown as SurveyFarmInsertTable;
  const { error } = await linksTable.insert({ survey_id: surveyId, farm_id: farmId, relationship_type: relationshipType, area_covered_hectares: areaCoveredHectares, is_primary: isPrimary, notes, created_by: actor.id });
  if (error) throw new Error("Failed to link survey to farm.", { cause: error });

  revalidatePath("/admin");
  revalidatePath("/admin/surveys");
  revalidatePath(`/admin/surveys/${surveyId}`);
  revalidatePath(`/admin/farms/${farmId}`);
}

export async function linkSurveyOrganization(formData: FormData) {
  const actor = await assertPlatformAdmin();
  const surveyId = readRequiredString(formData, "surveyId");
  const organizationId = readRequiredString(formData, "organizationId");
  const relationshipType = parseRelationshipType(readRequiredString(formData, "relationshipType"));
  const notes = readOptionalString(formData, "relationshipNotes");
  const supabase = await createClient();

  const [surveyResponse, organizationResponse, existingResponse] = await Promise.all([
    supabase.from("surveys").select("id").eq("id", surveyId).maybeSingle(),
    supabase.from("organizations").select("id, status").eq("id", organizationId).maybeSingle(),
    supabase.from("survey_organizations").select("survey_id, organization_id, review_status").eq("survey_id", surveyId).eq("organization_id", organizationId).limit(1),
  ]);
  if (surveyResponse.error) throw new Error("Failed to verify survey.", { cause: surveyResponse.error });
  if (!surveyResponse.data) throw new Error("Survey not found.");
  if (organizationResponse.error) throw new Error("Failed to verify organization.", { cause: organizationResponse.error });
  if (!organizationResponse.data) throw new Error("Organization not found.");
  const organization = organizationResponse.data as Pick<Tables<"organizations">, "id" | "status">;
  if (organization.status !== "active") throw new Error("Only active organizations can be linked to surveys.");
  if (existingResponse.error) throw new Error("Failed to check existing survey organization link.", { cause: existingResponse.error });
  if ((existingResponse.data ?? []).length > 0) throw new Error("This survey is already linked to that organization.");

  const linksTable = supabase.from("survey_organizations") as unknown as SurveyOrganizationInsertTable;
  const { error } = await linksTable.insert({ survey_id: surveyId, organization_id: organizationId, relationship_type: relationshipType, review_status: "confirmed", notes, created_by: actor.id });
  if (error) throw new Error("Failed to link survey to organization.", { cause: error });

  revalidatePath("/admin");
  revalidatePath("/admin/surveys");
  revalidatePath(`/admin/surveys/${surveyId}`);
  revalidatePath(`/admin/organizations/${organizationId}`);
}
