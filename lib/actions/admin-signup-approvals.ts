"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type MembershipRole = Database["public"]["Enums"]["membership_role"];
const roles = new Set<MembershipRole>(["member", "org_admin"]);

function required(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Missing required signup request field.");
  }
  return value.trim();
}

function optional(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 2000)
    : null;
}

async function requirePlatformAdmin() {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin" || profile.account_status !== "active") {
    throw new Error("Only active platform admins can review signup requests.");
  }
}

export async function approveSignupRequest(formData: FormData) {
  await requirePlatformAdmin();
  const role = required(formData, "initialRole");
  if (!roles.has(role as MembershipRole)) {
    throw new Error("Invalid initial organization role.");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_approve_signup_request", {
    target_request_id: required(formData, "requestId"),
    target_organization_id: required(formData, "organizationId"),
    target_initial_role: role as MembershipRole,
    target_review_notes: optional(formData, "reviewNotes") ?? undefined,
  });
  if (error) throw new Error("Failed to approve the signup request.", { cause: error });
  revalidatePath("/admin/signup-approvals");
  revalidatePath("/admin/users");
}

export async function rejectSignupRequest(formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reject_signup_request", {
    target_request_id: required(formData, "requestId"),
    target_review_notes: optional(formData, "reviewNotes") ?? undefined,
  });
  if (error) throw new Error("Failed to reject the signup request.", { cause: error });
  revalidatePath("/admin/signup-approvals");
  revalidatePath("/admin/users");
}
