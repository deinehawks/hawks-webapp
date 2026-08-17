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
type TargetFarm = Pick<Tables<"farms">, "id">;
type ExistingGrant = Pick<Tables<"farm_access_grants">, "id">;
type FarmGrantStatus = Database["public"]["Enums"]["access_grant_status"];
type StoredFarmGrant = Pick<
  Tables<"farm_access_grants">,
  "id" | "profile_id" | "farm_id" | "status"
>;

type FarmGrantInsertTable = {
  insert(values: TablesInsert<"farm_access_grants">): PromiseLike<{
    error: PostgrestError | null;
  }>;
};

type FarmGrantUpdateTable = {
  update(values: TablesUpdate<"farm_access_grants">): {
    eq(column: "id", value: string): PromiseLike<{
      error: PostgrestError | null;
    }>;
  };
};

const allowedGrantTransitions = {
  active: ["revoked"],
  revoked: ["active"],
  expired: ["active"],
} as const satisfies Record<FarmGrantStatus, readonly FarmGrantStatus[]>;

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Missing required farm grant field.");
  }

  return value.trim();
}

function readOptionalReason(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 2000)
    : null;
}

function parseGrantStatus(value: string): FarmGrantStatus {
  if (value in allowedGrantTransitions) {
    return value as FarmGrantStatus;
  }

  throw new Error("Invalid farm grant status.");
}

export async function createFarmAccessGrant(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can create farm access grants.");
  }

  const profileId = readRequiredString(formData, "profileId");
  const farmId = readRequiredString(formData, "farmId");
  const reason = readOptionalReason(formData, "farmGrantReason");
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
    throw new Error("Platform administrators do not need farm access grants.");
  }

  const { data: targetFarm, error: farmError } = (await supabase
    .from("farms")
    .select("id")
    .eq("id", farmId)
    .maybeSingle()) as {
    data: TargetFarm | null;
    error: PostgrestError | null;
  };

  if (farmError) {
    throw new Error("Failed to verify the farm.", { cause: farmError });
  }

  if (!targetFarm) {
    throw new Error("Farm not found.");
  }

  const { data: existingGrant, error: existingGrantError } = (await supabase
    .from("farm_access_grants")
    .select("id")
    .eq("profile_id", profileId)
    .eq("farm_id", farmId)
    .eq("status", "active")
    .maybeSingle()) as {
    data: ExistingGrant | null;
    error: PostgrestError | null;
  };

  if (existingGrantError) {
    throw new Error("Failed to check existing farm access grants.", {
      cause: existingGrantError,
    });
  }

  if (existingGrant) {
    throw new Error("This user already has an active grant for this farm.");
  }

  const now = new Date().toISOString();
  const insertPayload: TablesInsert<"farm_access_grants"> = {
    profile_id: profileId,
    farm_id: farmId,
    status: "active",
    granted_by: profile.id,
    reason,
    created_at: now,
    updated_at: now,
  };

  const grantsTable = supabase
    .from("farm_access_grants") as unknown as FarmGrantInsertTable;
  const { error: insertError } = await grantsTable.insert(insertPayload);

  if (insertError) {
    throw new Error("Failed to create farm access grant.", {
      cause: insertError,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${profileId}`);
  revalidatePath(`/admin/access-preview/${profileId}`);
}

export async function updateFarmAccessGrantStatus(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can update farm access grants.");
  }

  const grantId = readRequiredString(formData, "grantId");
  const nextStatus = parseGrantStatus(readRequiredString(formData, "nextStatus"));
  const reason = readOptionalReason(formData, "grantReason");
  const supabase = await createClient();

  const { data: grant, error: grantError } = (await supabase
    .from("farm_access_grants")
    .select("id, profile_id, farm_id, status")
    .eq("id", grantId)
    .maybeSingle()) as {
    data: StoredFarmGrant | null;
    error: PostgrestError | null;
  };

  if (grantError) {
    throw new Error("Failed to verify the farm access grant.", {
      cause: grantError,
    });
  }

  if (!grant) {
    throw new Error("Farm access grant not found.");
  }

  const allowedNextStatuses = allowedGrantTransitions[grant.status];

  if (!(allowedNextStatuses as readonly FarmGrantStatus[]).includes(nextStatus)) {
    throw new Error("This farm grant status transition is not allowed.");
  }

  if (nextStatus === "active") {
    const { data: duplicateGrant, error: duplicateError } = (await supabase
      .from("farm_access_grants")
      .select("id")
      .eq("profile_id", grant.profile_id)
      .eq("farm_id", grant.farm_id)
      .eq("status", "active")
      .neq("id", grant.id)
      .maybeSingle()) as {
      data: ExistingGrant | null;
      error: PostgrestError | null;
    };

    if (duplicateError) {
      throw new Error("Failed to check active farm access grants.", {
        cause: duplicateError,
      });
    }

    if (duplicateGrant) {
      throw new Error("This user already has an active grant for this farm.");
    }
  }

  const updatePayload: TablesUpdate<"farm_access_grants"> = {
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
    .from("farm_access_grants") as unknown as FarmGrantUpdateTable;
  const { error: updateError } = await grantsTable
    .update(updatePayload)
    .eq("id", grantId);

  if (updateError) {
    throw new Error("Failed to update farm access grant.", {
      cause: updateError,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${grant.profile_id}`);
  revalidatePath(`/admin/access-preview/${grant.profile_id}`);
}
