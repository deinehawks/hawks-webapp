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

export async function updateClientClassification(formData: FormData) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can classify legacy clients.");
  }

  const clientId = readRequiredString(formData, "clientId");
  const classificationKind = parseClassificationKind(
    readRequiredString(formData, "classificationKind"),
  );
  const notesValue = formData.get("classificationNotes");
  const classificationNotes =
    typeof notesValue === "string" && notesValue.trim().length > 0
      ? notesValue.trim().slice(0, 2000)
      : null;

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

  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/admin/clients/${clientId}`);
}