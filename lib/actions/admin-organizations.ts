"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type OrganizationInsertTable = {
  insert(values: TablesInsert<"organizations">): {
    select(columns: "id"): {
      single(): PromiseLike<{
        data: Pick<Tables<"organizations">, "id"> | null;
        error: PostgrestError | null;
      }>;
    };
  };
};

type OrganizationUpdateTable = {
  update(values: TablesUpdate<"organizations">): {
    eq(column: "id", value: string): PromiseLike<{
      error: PostgrestError | null;
    }>;
  };
};

const allowedStatuses = ["active", "inactive"] as const;

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Missing required organization field.");
  }

  return value.trim();
}

function readOptionalString(
  formData: FormData,
  key: string,
  maxLength = 2000,
): string | null {
  const value = formData.get(key);

  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, maxLength)
    : null;
}

function parseStatus(value: string): (typeof allowedStatuses)[number] {
  if ((allowedStatuses as readonly string[]).includes(value)) {
    return value as (typeof allowedStatuses)[number];
  }

  throw new Error("Invalid organization status.");
}

async function assertPlatformAdmin() {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can manage organizations.");
  }

  return profile;
}

async function assertOrganizationType(typeCode: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_types")
    .select("code")
    .eq("code", typeCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to verify organization type.", { cause: error });
  }

  if (!data) {
    throw new Error("Organization type is not available.");
  }
}

async function assertUniqueCode(code: string | null, organizationId?: string) {
  if (!code) {
    return;
  }

  const supabase = await createClient();
  let query = supabase.from("organizations").select("id").eq("code", code);

  if (organizationId) {
    query = query.neq("id", organizationId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    throw new Error("Failed to check organization code.", { cause: error });
  }

  if ((data ?? []).length > 0) {
    throw new Error("Another organization already uses this code.");
  }
}

function readOrganizationPayload(formData: FormData) {
  return {
    name: readRequiredString(formData, "name").slice(0, 200),
    type_code: readRequiredString(formData, "typeCode").slice(0, 80),
    code: readOptionalString(formData, "code", 80),
    email: readOptionalString(formData, "email", 320),
    mobile: readOptionalString(formData, "mobile", 80),
    telephone: readOptionalString(formData, "telephone", 80),
    street: readOptionalString(formData, "street", 200),
    village: readOptionalString(formData, "village", 120),
    barangay: readOptionalString(formData, "barangay", 120),
    city: readOptionalString(formData, "city", 120),
    province: readOptionalString(formData, "province", 120),
    region: readOptionalString(formData, "region", 120),
    country: readOptionalString(formData, "country", 120),
    zip_code: readOptionalString(formData, "zipCode", 40),
    notes: readOptionalString(formData, "notes"),
  };
}

export async function createOrganization(formData: FormData) {
  const actor = await assertPlatformAdmin();
  const payload = readOrganizationPayload(formData);

  await assertOrganizationType(payload.type_code);
  await assertUniqueCode(payload.code);

  const supabase = await createClient();
  const organizationsTable = supabase
    .from("organizations") as unknown as OrganizationInsertTable;
  const { data, error } = await organizationsTable
    .insert({
      ...payload,
      status: "active",
      created_by: actor.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error("Failed to create organization.", { cause: error });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/users");

  if (!data?.id) {
    redirect("/admin/organizations");
  }

  revalidatePath(`/admin/organizations/${data.id}`);
  redirect(`/admin/organizations/${data.id}`);
}

export async function updateOrganization(formData: FormData) {
  await assertPlatformAdmin();

  const organizationId = readRequiredString(formData, "organizationId");
  const payload = readOrganizationPayload(formData);

  await assertOrganizationType(payload.type_code);
  await assertUniqueCode(payload.code, organizationId);

  const supabase = await createClient();
  const organizationsTable = supabase
    .from("organizations") as unknown as OrganizationUpdateTable;
  const { error } = await organizationsTable
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (error) {
    throw new Error("Failed to update organization.", { cause: error });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${organizationId}`);
  revalidatePath("/admin/users");
}

export async function updateOrganizationStatus(formData: FormData) {
  await assertPlatformAdmin();

  const organizationId = readRequiredString(formData, "organizationId");
  const nextStatus = parseStatus(readRequiredString(formData, "nextStatus"));
  const supabase = await createClient();

  const { data: organization, error: loadError } = (await supabase
    .from("organizations")
    .select("id, status")
    .eq("id", organizationId)
    .maybeSingle()) as {
    data: Pick<Tables<"organizations">, "id" | "status"> | null;
    error: PostgrestError | null;
  };

  if (loadError) {
    throw new Error("Failed to verify organization.", { cause: loadError });
  }

  if (!organization) {
    throw new Error("Organization not found.");
  }

  if (organization.status === nextStatus) {
    throw new Error("Organization already has this status.");
  }

  const organizationsTable = supabase
    .from("organizations") as unknown as OrganizationUpdateTable;
  const { error } = await organizationsTable
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (error) {
    throw new Error("Failed to update organization status.", { cause: error });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${organizationId}`);
  revalidatePath("/admin/users");
}
