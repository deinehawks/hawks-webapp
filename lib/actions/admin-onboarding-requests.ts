"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import { createClient } from "@/utils/supabase/server";

function required(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Missing required onboarding review field.");
  }
  return value.trim();
}

function optional(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 2000)
    : undefined;
}

async function requirePlatformAdmin() {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin" || profile.account_status !== "active") {
    throw new Error("Only active platform admins can review onboarding requests.");
  }
}

export async function approveOrganizationOnboardingRequest(formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_approve_organization_user_request", {
    target_request_id: required(formData, "requestId"),
    target_review_notes: optional(formData, "reviewNotes"),
  });
  if (error) throw new Error("Failed to approve the onboarding request.", { cause: error });
  revalidatePath("/admin/onboarding-requests");
}

export async function rejectOrganizationOnboardingRequest(formData: FormData) {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reject_organization_user_request", {
    target_request_id: required(formData, "requestId"),
    target_review_notes: optional(formData, "reviewNotes"),
  });
  if (error) throw new Error("Failed to reject the onboarding request.", { cause: error });
  revalidatePath("/admin/onboarding-requests");
}
