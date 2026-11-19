"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type RelationshipType = Database["public"]["Enums"]["domain_relationship_type"];

type FarmInsertTable = {
  insert(values: TablesInsert<"farms">): {
    select(columns: "id"): {
      single(): PromiseLike<{ data: Pick<Tables<"farms">, "id"> | null; error: PostgrestError | null }>;
    };
  };
};

type FarmUpdateTable = {
  update(values: TablesUpdate<"farms">): {
    eq(column: "id", value: string): PromiseLike<{ error: PostgrestError | null }>;
  };
};

type FarmOrganizationInsertTable = {
  insert(values: TablesInsert<"farm_organizations">): PromiseLike<{ error: PostgrestError | null }>;
};

const allowedStatuses = ["active", "inactive"] as const;
const allowedRelationshipTypes = ["owner", "operator", "representative", "contact", "member", "requester", "participant", "legacy_client", "other"] as const satisfies readonly RelationshipType[];

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Missing required farm field.");
  }
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
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid farm area value.");
  }
  return parsed;
}

function parseStatus(value: string): (typeof allowedStatuses)[number] {
  if ((allowedStatuses as readonly string[]).includes(value)) return value as (typeof allowedStatuses)[number];
  throw new Error("Invalid farm status.");
}

function parseRelationshipType(value: string): RelationshipType {
  if ((allowedRelationshipTypes as readonly string[]).includes(value)) return value as RelationshipType;
  throw new Error("Invalid farm organization relationship type.");
}

async function assertPlatformAdmin() {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can manage farms.");
  }
  return profile;
}

function readFarmPayload(formData: FormData) {
  return {
    name: readRequiredString(formData, "name").slice(0, 200),
    code: readOptionalString(formData, "code", 80),
    crop: readOptionalString(formData, "crop", 80) ?? "banana",
    area_hectares: readOptionalNumber(formData, "areaHectares"),
    location_name: readOptionalString(formData, "locationName", 200),
    notes: readOptionalString(formData, "notes"),
  };
}

async function assertUniqueCode(code: string | null, farmId?: string) {
  if (!code) return;
  const supabase = await createClient();
  let query = supabase.from("farms").select("id").eq("code", code);
  if (farmId) query = query.neq("id", farmId);
  const { data, error } = await query.limit(1);
  if (error) throw new Error("Failed to check farm code.", { cause: error });
  if ((data ?? []).length > 0) throw new Error("Another farm already uses this code.");
}

export async function createFarm(formData: FormData) {
  const actor = await assertPlatformAdmin();
  const payload = readFarmPayload(formData);
  await assertUniqueCode(payload.code);

  const supabase = await createClient();
  const farmsTable = supabase.from("farms") as unknown as FarmInsertTable;
  const { data, error } = await farmsTable.insert({ ...payload, status: "active", created_by: actor.id }).select("id").single();
  if (error) throw new Error("Failed to create farm.", { cause: error });

  revalidatePath("/admin");
  revalidatePath("/admin/farms");
  revalidatePath("/admin/users");

  if (!data?.id) redirect("/admin/farms");
  revalidatePath(`/admin/farms/${data.id}`);
  redirect(`/admin/farms/${data.id}`);
}

export async function updateFarm(formData: FormData) {
  await assertPlatformAdmin();
  const farmId = readRequiredString(formData, "farmId");
  const payload = readFarmPayload(formData);
  await assertUniqueCode(payload.code, farmId);

  const supabase = await createClient();
  const farmsTable = supabase.from("farms") as unknown as FarmUpdateTable;
  const { error } = await farmsTable.update({ ...payload, updated_at: new Date().toISOString() }).eq("id", farmId);
  if (error) throw new Error("Failed to update farm.", { cause: error });

  revalidatePath("/admin");
  revalidatePath("/admin/farms");
  revalidatePath(`/admin/farms/${farmId}`);
}

export async function updateFarmStatus(formData: FormData) {
  await assertPlatformAdmin();
  const farmId = readRequiredString(formData, "farmId");
  const nextStatus = parseStatus(readRequiredString(formData, "nextStatus"));
  const supabase = await createClient();

  const { data: farm, error: loadError } = (await supabase.from("farms").select("id, status").eq("id", farmId).maybeSingle()) as {
    data: Pick<Tables<"farms">, "id" | "status"> | null;
    error: PostgrestError | null;
  };
  if (loadError) throw new Error("Failed to verify farm.", { cause: loadError });
  if (!farm) throw new Error("Farm not found.");
  if (farm.status === nextStatus) throw new Error("Farm already has this status.");

  const farmsTable = supabase.from("farms") as unknown as FarmUpdateTable;
  const { error } = await farmsTable.update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", farmId);
  if (error) throw new Error("Failed to update farm status.", { cause: error });

  revalidatePath("/admin");
  revalidatePath("/admin/farms");
  revalidatePath(`/admin/farms/${farmId}`);
}

export async function confirmFarmOrganizationLink(formData: FormData) {
  const actor = await assertPlatformAdmin();
  const farmId = readRequiredString(formData, "farmId");
  const organizationId = readRequiredString(formData, "organizationId");
  const relationshipType = parseRelationshipType(readRequiredString(formData, "relationshipType"));
  const notes = readOptionalString(formData, "relationshipNotes");
  const supabase = await createClient();

  const [farmResponse, organizationResponse, existingResponse] = await Promise.all([
    supabase.from("farms").select("id").eq("id", farmId).maybeSingle(),
    supabase.from("organizations").select("id, status").eq("id", organizationId).maybeSingle(),
    supabase.from("farm_organizations").select("farm_id, organization_id, review_status").eq("farm_id", farmId).eq("organization_id", organizationId).limit(1),
  ]);

  if (farmResponse.error) throw new Error("Failed to verify farm.", { cause: farmResponse.error });
  if (!farmResponse.data) throw new Error("Farm not found.");
  if (organizationResponse.error) throw new Error("Failed to verify organization.", { cause: organizationResponse.error });
  if (!organizationResponse.data) throw new Error("Organization not found.");
  const organization = organizationResponse.data as Pick<Tables<"organizations">, "id" | "status">;
  if (organization.status !== "active") throw new Error("Only active organizations can be linked to farms.");
  if (existingResponse.error) throw new Error("Failed to check existing farm organization link.", { cause: existingResponse.error });
  if ((existingResponse.data ?? []).length > 0) throw new Error("This farm is already linked to that organization.");

  const linksTable = supabase.from("farm_organizations") as unknown as FarmOrganizationInsertTable;
  const { error } = await linksTable.insert({
    farm_id: farmId,
    organization_id: organizationId,
    relationship_type: relationshipType,
    review_status: "confirmed",
    notes,
    created_by: actor.id,
  });
  if (error) throw new Error("Failed to link farm to organization.", { cause: error });

  revalidatePath("/admin");
  revalidatePath("/admin/farms");
  revalidatePath(`/admin/farms/${farmId}`);
  revalidatePath(`/admin/organizations/${organizationId}`);
}