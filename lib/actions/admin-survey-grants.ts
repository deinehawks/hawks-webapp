"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type TargetProfile = Pick<Tables<"profiles">, "id" | "role">;
type TargetSurvey = Pick<Tables<"surveys">, "id">;
type ExistingGrant = Pick<Tables<"survey_access_grants">, "id">;
type SurveyGrantStatus = Database["public"]["Enums"]["access_grant_status"];
type StoredSurveyGrant = Pick<
  Tables<"survey_access_grants">,
  "id" | "profile_id" | "survey_id" | "status"
>;

type SurveyGrantInsertTable = {
  insert(values: TablesInsert<"survey_access_grants">): PromiseLike<{
    error: PostgrestError | null;
  }>;
};

type SurveyGrantUpdateTable = {
  update(values: TablesUpdate<"survey_access_grants">): {
    eq(column: "id", value: string): PromiseLike<{
      error: PostgrestError | null;
    }>;
  };
};

const allowedGrantTransitions = {
  active: ["revoked"],
  revoked: ["active"],
  expired: ["active"],
} as const satisfies Record<SurveyGrantStatus, readonly SurveyGrantStatus[]>;

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

function parseGrantStatus(value: string): SurveyGrantStatus {
  if (value in allowedGrantTransitions) {
    return value as SurveyGrantStatus;
  }

  throw new Error("Invalid survey grant status.");
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
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${profileId}`);
}

export async function updateSurveyAccessGrantStatus(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can update survey access grants.");
  }

  const grantId = readRequiredString(formData, "grantId");
  const nextStatus = parseGrantStatus(readRequiredString(formData, "nextStatus"));
  const reason = readOptionalReason(formData, "grantReason");
  const supabase = await createClient();

  const { data: grant, error: grantError } = (await supabase
    .from("survey_access_grants")
    .select("id, profile_id, survey_id, status")
    .eq("id", grantId)
    .maybeSingle()) as {
    data: StoredSurveyGrant | null;
    error: PostgrestError | null;
  };

  if (grantError) {
    throw new Error("Failed to verify the survey access grant.", {
      cause: grantError,
    });
  }

  if (!grant) {
    throw new Error("Survey access grant not found.");
  }

  const allowedNextStatuses = allowedGrantTransitions[grant.status];

  if (!(allowedNextStatuses as readonly SurveyGrantStatus[]).includes(nextStatus)) {
    throw new Error("This survey grant status transition is not allowed.");
  }

  if (nextStatus === "active") {
    const { data: duplicateGrant, error: duplicateError } = (await supabase
      .from("survey_access_grants")
      .select("id")
      .eq("profile_id", grant.profile_id)
      .eq("survey_id", grant.survey_id)
      .eq("status", "active")
      .neq("id", grant.id)
      .maybeSingle()) as {
      data: ExistingGrant | null;
      error: PostgrestError | null;
    };

    if (duplicateError) {
      throw new Error("Failed to check active survey access grants.", {
        cause: duplicateError,
      });
    }

    if (duplicateGrant) {
      throw new Error("This user already has an active grant for this survey.");
    }
  }

  const updatePayload: TablesUpdate<"survey_access_grants"> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
    revoked_by: nextStatus === "revoked" ? profile.id : null,
  };

  if (reason) {
    updatePayload.reason = reason;
  }

  if (nextStatus === "active") {
    updatePayload.expires_at = null;
  }

  const grantsTable = supabase
    .from("survey_access_grants") as unknown as SurveyGrantUpdateTable;
  const { error: updateError } = await grantsTable
    .update(updatePayload)
    .eq("id", grantId);

  if (updateError) {
    throw new Error("Failed to update survey access grant.", {
      cause: updateError,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${grant.profile_id}`);
}
