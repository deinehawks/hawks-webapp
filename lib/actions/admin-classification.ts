"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Database, TablesUpdate } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type ClientClassificationKind =
  Database["public"]["Enums"]["client_classification_kind"];

type ClientUpdateTable = {
  update(values: TablesUpdate<"clients">): {
    eq(
      column: "id",
      value: string,
    ): PromiseLike<{ error: PostgrestError | null }>;
  };
};

type AdminMappingRpcName =
  | "admin_confirm_client_organization_mapping"
  | "admin_confirm_client_person_mapping"
  | "admin_create_organization_for_client_mapping"
  | "admin_create_person_for_client_mapping";

type AdminMappingRpcArgs = {
  target_client_id: string;
  target_organization_id?: string;
  target_person_id?: string;
  organization_name?: string;
  organization_type_code?: string;
  organization_code?: string | null;
  organization_notes?: string | null;
  person_display_name?: string;
  person_first_name?: string | null;
  person_last_name?: string | null;
  person_mobile?: string | null;
  person_notes?: string | null;
  mapping_notes: string | null;
};

type AdminMappingRpcClient = {
  rpc(
    functionName: AdminMappingRpcName,
    args: AdminMappingRpcArgs,
  ): PromiseLike<{ error: PostgrestError | null }>;
};

const clientClassificationKinds = [
  "unclassified",
  "organization",
  "individual",
  "other",
] as const satisfies readonly ClientClassificationKind[];

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Missing required classification field.");
  }

  return value.trim();
}

function parseClassificationKind(value: string): ClientClassificationKind {
  if (
    clientClassificationKinds.includes(value as ClientClassificationKind)
  ) {
    return value as ClientClassificationKind;
  }

  throw new Error("Invalid client classification kind.");
}

function readOptionalNotes(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 2000)
    : null;
}

export async function updateClientClassification(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can classify legacy clients.");
  }

  const clientId = readRequiredString(formData, "clientId");
  const classificationKind = parseClassificationKind(
    readRequiredString(formData, "classificationKind"),
  );
  const classificationNotes = readOptionalNotes(
    formData,
    "classificationNotes",
  );

  const supabase = await createClient();
  const { data: existingClient, error: loadError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();

  if (loadError) {
    throw new Error("Failed to verify the legacy client before classification.", {
      cause: loadError,
    });
  }

  if (!existingClient) {
    throw new Error("Legacy client not found.");
  }

  const updatePayload: TablesUpdate<"clients"> = {
    classification_kind: classificationKind,
    classification_notes: classificationNotes,
    classification_reviewed_at: new Date().toISOString(),
    classification_reviewed_by: profile.id,
  };

  const clientsTable = supabase.from("clients") as unknown as ClientUpdateTable;
  const { error: updateError } = await clientsTable
    .update(updatePayload)
    .eq("id", clientId);

  if (updateError) {
    throw new Error("Failed to update legacy client classification.", {
      cause: updateError,
    });
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function confirmClientOrganizationMapping(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can map legacy clients.");
  }

  const clientId = readRequiredString(formData, "clientId");
  const organizationId = readRequiredString(formData, "organizationId");
  const mappingNotes = readOptionalNotes(formData, "mappingNotes");
  const supabase = (await createClient()) as unknown as AdminMappingRpcClient;
  const { error } = await supabase.rpc(
    "admin_confirm_client_organization_mapping",
    {
      target_client_id: clientId,
      target_organization_id: organizationId,
      mapping_notes: mappingNotes,
    },
  );

  if (error) {
    throw new Error("Failed to confirm legacy client organization mapping.", {
      cause: error,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients/" + clientId);
}

export async function confirmClientPersonMapping(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can map legacy clients.");
  }

  const clientId = readRequiredString(formData, "clientId");
  const personId = readRequiredString(formData, "personId");
  const mappingNotes = readOptionalNotes(formData, "mappingNotes");
  const supabase = (await createClient()) as unknown as AdminMappingRpcClient;
  const { error } = await supabase.rpc("admin_confirm_client_person_mapping", {
    target_client_id: clientId,
    target_person_id: personId,
    mapping_notes: mappingNotes,
  });

  if (error) {
    throw new Error("Failed to confirm legacy client person mapping.", {
      cause: error,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients/" + clientId);
}


export async function createOrganizationForClientMapping(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can create mapped organizations.");
  }

  const clientId = readRequiredString(formData, "clientId");
  const organizationName = readRequiredString(formData, "organizationName");
  const organizationTypeCode = readRequiredString(
    formData,
    "organizationTypeCode",
  );
  const organizationCode = readOptionalNotes(formData, "organizationCode");
  const organizationNotes = readOptionalNotes(formData, "organizationNotes");
  const mappingNotes = readOptionalNotes(formData, "mappingNotes");
  const supabase = (await createClient()) as unknown as AdminMappingRpcClient;
  const { error } = await supabase.rpc(
    "admin_create_organization_for_client_mapping",
    {
      target_client_id: clientId,
      organization_name: organizationName,
      organization_type_code: organizationTypeCode,
      organization_code: organizationCode,
      organization_notes: organizationNotes,
      mapping_notes: mappingNotes,
    },
  );

  if (error) {
    throw new Error("Failed to create and map canonical organization.", {
      cause: error,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients/" + clientId);
}

export async function createPersonForClientMapping(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can create mapped people.");
  }

  const clientId = readRequiredString(formData, "clientId");
  const personDisplayName = readRequiredString(formData, "personDisplayName");
  const personFirstName = readOptionalNotes(formData, "personFirstName");
  const personLastName = readOptionalNotes(formData, "personLastName");
  const personMobile = readOptionalNotes(formData, "personMobile");
  const personNotes = readOptionalNotes(formData, "personNotes");
  const mappingNotes = readOptionalNotes(formData, "mappingNotes");
  const supabase = (await createClient()) as unknown as AdminMappingRpcClient;
  const { error } = await supabase.rpc(
    "admin_create_person_for_client_mapping",
    {
      target_client_id: clientId,
      person_display_name: personDisplayName,
      person_first_name: personFirstName,
      person_last_name: personLastName,
      person_mobile: personMobile,
      person_notes: personNotes,
      mapping_notes: mappingNotes,
    },
  );

  if (error) {
    throw new Error("Failed to create and map canonical person.", {
      cause: error,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients/" + clientId);
}
