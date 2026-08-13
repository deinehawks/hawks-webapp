"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Tables, TablesInsert } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type TargetProfile = Pick<Tables<"profiles">, "id" | "role">;
type TargetSurvey = Pick<Tables<"surveys">, "id">;
type ExistingGrant = Pick<Tables<"survey_access_grants">, "id">;

type SurveyGrantInsertTable = {
  insert(values: TablesInsert<"survey_access_grants">): PromiseLike<{
    error: PostgrestError | null;
  }>;
};

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Missing required survey grant field.");
  }

  return value.trim();
}

function readOptionalReason(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 2000)
    : null;
}

export async function createSurveyAccessGrant(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can create survey access grants.");
  }

  const profileId = readRequiredString(formData, "profileId");
  const surveyId = readRequiredString(formData, "surveyId");
  const reason = readOptionalReason(formData, "surveyGrantReason");
  const supabase = await createClient();

  const { data: targetProfile, error: profileError } = (await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .maybeSingle()) as {
    data: TargetProfile | null;
    error: PostgrestError | null;
  };

  if (profileError) {
    throw new Error("Failed to verify the target user account.", {
      cause: profileError,
    });
  }

  if (!targetProfile) {
    throw new Error("Target user account not found.");
  }

  if (targetProfile.role === "platform_admin") {
    throw new Error("Platform administrators do not need survey access grants.");
  }

  const { data: targetSurvey, error: surveyError } = (await supabase
    .from("surveys")
    .select("id")
    .eq("id", surveyId)
    .maybeSingle()) as {
    data: TargetSurvey | null;
    error: PostgrestError | null;
  };

  if (surveyError) {
    throw new Error("Failed to verify the survey.", { cause: surveyError });
  }

  if (!targetSurvey) {
    throw new Error("Survey not found.");
  }

  const { data: existingGrant, error: existingGrantError } = (await supabase
    .from("survey_access_grants")
    .select("id")
    .eq("profile_id", profileId)
    .eq("survey_id", surveyId)
    .eq("status", "active")
    .maybeSingle()) as {
    data: ExistingGrant | null;
    error: PostgrestError | null;
  };

  if (existingGrantError) {
    throw new Error("Failed to check existing survey access grants.", {
      cause: existingGrantError,
    });
  }

  if (existingGrant) {
    throw new Error("This user already has an active grant for this survey.");
  }

  const now = new Date().toISOString();
  const insertPayload: TablesInsert<"survey_access_grants"> = {
    profile_id: profileId,
    survey_id: surveyId,
    status: "active",
    granted_by: profile.id,
    reason,
    created_at: now,
    updated_at: now,
  };

  const grantsTable = supabase
    .from("survey_access_grants") as unknown as SurveyGrantInsertTable;
  const { error: insertError } = await grantsTable.insert(insertPayload);

  if (insertError) {
    throw new Error("Failed to create survey access grant.", {
      cause: insertError,
    });
  }

  revalidatePath("/admin");
}
