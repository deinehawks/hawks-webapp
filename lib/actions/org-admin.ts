"use server";

import { revalidatePath } from "next/cache";

import type { Database } from "@/lib/database.types";
import { getOrgAdminContext } from "@/lib/org-admin/context";
import { createClient } from "@/utils/supabase/server";

type MembershipStatus = Database["public"]["Enums"]["membership_status"];
type GrantStatus = Database["public"]["Enums"]["access_grant_status"];

function required(formData: FormData, key: string, label = key): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function optional(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(formData: FormData, key: string): number | undefined {
  const value = optional(formData, key);
  if (value === undefined) return undefined;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${key} must be a non-negative number.`);
  }
  return numberValue;
}

function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  return value as T;
}

function refreshPortal() {
  revalidatePath("/org-admin", "layout");
}

export async function updateOrgAdminOrganization(formData: FormData) {
  const { organization } = await getOrgAdminContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_admin_update_organization", {
    target_organization_id: organization.id,
    organization_name: required(formData, "name", "Organization name"),
    organization_code: required(formData, "code", "Organization code"),
    organization_type_code: required(formData, "typeCode", "Organization type"),
    organization_email: optional(formData, "email"),
    organization_mobile: optional(formData, "mobile"),
    organization_telephone: optional(formData, "telephone"),
    organization_street: optional(formData, "street"),
    organization_village: optional(formData, "village"),
    organization_barangay: optional(formData, "barangay"),
    organization_city: optional(formData, "city"),
    organization_province: optional(formData, "province"),
    organization_region: optional(formData, "region"),
    organization_country: optional(formData, "country"),
    organization_zip_code: optional(formData, "zipCode"),
    organization_notes: optional(formData, "notes"),
  });
  if (error) throw new Error("Failed to update the organization.", { cause: error });
  refreshPortal();
}

export async function createOrgAdminOnboardingRequest(formData: FormData) {
  await getOrgAdminContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_admin_create_user_request", {
    email: required(formData, "email", "Email"),
    name: optional(formData, "name"),
    request_notes: optional(formData, "notes"),
  });
  if (error) throw new Error("Failed to submit the onboarding request.", { cause: error });
  refreshPortal();
}

export async function cancelOrgAdminOnboardingRequest(formData: FormData) {
  await getOrgAdminContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_admin_cancel_user_request", {
    request_id: required(formData, "requestId"),
  });
  if (error) throw new Error("Failed to cancel the onboarding request.", { cause: error });
  refreshPortal();
}

export async function updateOrgAdminMemberStatus(formData: FormData) {
  await getOrgAdminContext();
  const nextStatus = oneOf<MembershipStatus>(
    required(formData, "nextStatus"),
    ["active", "suspended", "removed"],
    "membership status",
  );
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_admin_update_member_status", {
    membership_id: required(formData, "membershipId"),
    next_status: nextStatus,
    membership_notes: optional(formData, "notes"),
  });
  if (error) throw new Error("Failed to update the member.", { cause: error });
  refreshPortal();
}

export async function promoteOrgAdminMember(formData: FormData) {
  await getOrgAdminContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_admin_promote_member", {
    membership_id: required(formData, "membershipId"),
  });
  if (error) throw new Error("Failed to promote the member.", { cause: error });
  refreshPortal();
}

export async function createOrgAdminFarm(formData: FormData) {
  await getOrgAdminContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_admin_create_farm", {
    farm_name: required(formData, "name", "Farm name"),
    farm_code: optional(formData, "code"),
    farm_crop: optional(formData, "crop"),
    farm_location_name: optional(formData, "location"),
    farm_area_hectares: optionalNumber(formData, "areaHectares"),
    farm_notes: optional(formData, "notes"),
  });
  if (error) throw new Error("Failed to create the farm.", { cause: error });
  refreshPortal();
}

export async function updateOrgAdminFarm(formData: FormData) {
  await getOrgAdminContext();
  const status = oneOf(required(formData, "status"), ["active", "inactive"], "farm status");
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_admin_update_farm", {
    farm_id: required(formData, "farmId"),
    farm_name: required(formData, "name", "Farm name"),
    farm_code: optional(formData, "code"),
    farm_crop: optional(formData, "crop"),
    farm_location_name: optional(formData, "location"),
    farm_area_hectares: optionalNumber(formData, "areaHectares"),
    farm_notes: optional(formData, "notes"),
    farm_status: status,
  });
  if (error) throw new Error("Failed to update the farm.", { cause: error });
  refreshPortal();
}

export async function createOrgAdminFarmGrant(formData: FormData) {
  await getOrgAdminContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_admin_create_farm_grant", {
    target_profile_id: required(formData, "profileId"),
    target_farm_id: required(formData, "farmId"),
    grant_reason: optional(formData, "reason"),
  });
  if (error) throw new Error("Failed to grant farm access.", { cause: error });
  refreshPortal();
}

export async function setOrgAdminFarmGrantStatus(formData: FormData) {
  await getOrgAdminContext();
  const nextStatus = oneOf<GrantStatus>(
    required(formData, "nextStatus"),
    ["active", "revoked"],
    "grant status",
  );
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_admin_set_farm_grant_status", {
    grant_id: required(formData, "grantId"),
    next_status: nextStatus,
    grant_reason: optional(formData, "reason"),
  });
  if (error) throw new Error("Failed to update farm access.", { cause: error });
  refreshPortal();
}

export async function createOrgAdminSurveyGrant(formData: FormData) {
  await getOrgAdminContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_admin_create_survey_grant", {
    target_profile_id: required(formData, "profileId"),
    target_survey_id: required(formData, "surveyId"),
    grant_reason: optional(formData, "reason"),
  });
  if (error) throw new Error("Failed to grant survey access.", { cause: error });
  refreshPortal();
}

export async function setOrgAdminSurveyGrantStatus(formData: FormData) {
  await getOrgAdminContext();
  const nextStatus = oneOf<GrantStatus>(
    required(formData, "nextStatus"),
    ["active", "revoked"],
    "grant status",
  );
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_admin_set_survey_grant_status", {
    grant_id: required(formData, "grantId"),
    next_status: nextStatus,
    grant_reason: optional(formData, "reason"),
  });
  if (error) throw new Error("Failed to update survey access.", { cause: error });
  refreshPortal();
}
