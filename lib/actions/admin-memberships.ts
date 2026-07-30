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

type MembershipStatus = Database["public"]["Enums"]["membership_status"];
type TargetProfile = Pick<Tables<"profiles">, "id" | "role" | "account_role">;

type MembershipInsertTable = {
  insert(values: TablesInsert<"organization_memberships">): PromiseLike<{
    error: PostgrestError | null;
  }>;
};

type MembershipUpdateTable = {
  update(values: TablesUpdate<"organization_memberships">): {
    eq(column: "id", value: string): PromiseLike<{
      error: PostgrestError | null;
    }>;
  };
};

const allowedInitialStatuses = ["pending", "active"] as const satisfies readonly MembershipStatus[];
const allowedStatusTransitions = {
  invited: ["pending", "removed"],
  pending: ["active", "removed"],
  active: ["suspended", "removed"],
  suspended: ["active", "removed"],
  removed: [],
} as const satisfies Record<MembershipStatus, readonly MembershipStatus[]>;

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Missing required membership field.");
  }

  return value.trim();
}

function readOptionalNotes(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 2000)
    : null;
}

function parseInitialStatus(value: string): MembershipStatus {
  if ((allowedInitialStatuses as readonly string[]).includes(value)) {
    return value as MembershipStatus;
  }

  throw new Error("Invalid initial membership status.");
}

function parseMembershipStatus(value: string): MembershipStatus {
  if (value in allowedStatusTransitions) {
    return value as MembershipStatus;
  }

  throw new Error("Invalid membership status.");
}

export async function createOrganizationMembership(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can create memberships.");
  }

  const profileId = readRequiredString(formData, "profileId");
  const organizationId = readRequiredString(formData, "organizationId");
  const status = parseInitialStatus(readRequiredString(formData, "status"));
  const notes = readOptionalNotes(formData, "membershipNotes");
  const supabase = await createClient();

  const { data: targetProfile, error: profileError } = (await supabase
    .from("profiles")
    .select("id, role, account_role")
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

  if (
    targetProfile.role === "platform_admin" ||
    targetProfile.account_role === "platform_admin"
  ) {
    throw new Error("Platform administrators do not need organization memberships.");
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    throw new Error("Failed to verify the organization.", {
      cause: organizationError,
    });
  }

  if (!organization) {
    throw new Error("Organization not found.");
  }

  const { data: existingMemberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("id, organization_id, status")
    .eq("profile_id", profileId)
    .in("status", ["invited", "pending", "active", "suspended"]);

  if (membershipError) {
    throw new Error("Failed to check existing memberships.", {
      cause: membershipError,
    });
  }

  if ((existingMemberships ?? []).length > 0) {
    throw new Error("This user already has a live organization membership.");
  }

  const now = new Date().toISOString();
  const insertPayload: TablesInsert<"organization_memberships"> = {
    profile_id: profileId,
    organization_id: organizationId,
    role: "member",
    status,
    notes,
    invited_by: profile.id,
    invited_at: now,
    approved_by: status === "active" ? profile.id : null,
    approved_at: status === "active" ? now : null,
  };

  const membershipsTable = supabase
    .from("organization_memberships") as unknown as MembershipInsertTable;
  const { error: insertError } = await membershipsTable.insert(insertPayload);

  if (insertError) {
    throw new Error("Failed to create organization membership.", {
      cause: insertError,
    });
  }

  revalidatePath("/dashboard/admin");
}

export async function updateOrganizationMembershipStatus(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can update membership status.");
  }

  const membershipId = readRequiredString(formData, "membershipId");
  const nextStatus = parseMembershipStatus(
    readRequiredString(formData, "nextStatus"),
  );
  const notes = readOptionalNotes(formData, "membershipNotes");
  const supabase = await createClient();

  const { data: membership, error: membershipError } = (await supabase
    .from("organization_memberships")
    .select("id, role, status")
    .eq("id", membershipId)
    .maybeSingle()) as {
    data: Pick<
      Tables<"organization_memberships">,
      "id" | "role" | "status"
    > | null;
    error: PostgrestError | null;
  };

  if (membershipError) {
    throw new Error("Failed to verify organization membership.", {
      cause: membershipError,
    });
  }

  if (!membership) {
    throw new Error("Organization membership not found.");
  }

  if (membership.role !== "member") {
    throw new Error("Org-admin membership role changes are not enabled yet.");
  }

  const allowedNextStatuses = allowedStatusTransitions[membership.status];

  if (!(allowedNextStatuses as readonly MembershipStatus[]).includes(nextStatus)) {
    throw new Error("This membership status transition is not allowed.");
  }

  const now = new Date().toISOString();
  const updatePayload: TablesUpdate<"organization_memberships"> = {
    status: nextStatus,
    updated_at: now,
  };

  if (notes) {
    updatePayload.notes = notes;
  }

  if (nextStatus === "active") {
    updatePayload.approved_by = profile.id;
    updatePayload.approved_at = now;
    updatePayload.removed_at = null;
  }

  if (nextStatus === "removed") {
    updatePayload.removed_at = now;
  }

  const membershipsTable = supabase
    .from("organization_memberships") as unknown as MembershipUpdateTable;
  const { error: updateError } = await membershipsTable
    .update(updatePayload)
    .eq("id", membershipId);

  if (updateError) {
    throw new Error("Failed to update organization membership status.", {
      cause: updateError,
    });
  }

  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/admin/memberships/${membershipId}`);
}
