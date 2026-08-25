"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type OutputStatus = Database["public"]["Enums"]["output_status"];
type OutputRow = Pick<
  Tables<"survey_outputs">,
  | "id"
  | "survey_id"
  | "output_type"
  | "status"
  | "is_current"
  | "storage_bucket"
  | "storage_path"
>;

type OutputInsertTable = {
  insert(values: TablesInsert<"survey_outputs">): {
    select(columns: "id"): {
      single(): PromiseLike<{
        data: Pick<Tables<"survey_outputs">, "id"> | null;
        error: PostgrestError | null;
      }>;
    };
  };
};

type OutputUpdateTable = {
  update(values: TablesUpdate<"survey_outputs">): {
    eq(
      column: "id",
      value: string,
    ): PromiseLike<{ error: PostgrestError | null }>;
  };
};

type OutputRpcClient = {
  rpc(
    functionName: "admin_set_current_survey_output",
    args: { target_output_id: string },
  ): PromiseLike<{ error: PostgrestError | null }>;
};

const lockedStatuses = new Set<OutputStatus>(["published", "archived"]);
const allowedTransitions: Record<OutputStatus, readonly OutputStatus[]> = {
  draft: ["ready"],
  ready: ["draft", "approved"],
  approved: ["archived"],
  published: [],
  archived: [],
};

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0)
    throw new Error("Missing required output field.");
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

function parseOutputType(value: string): string {
  const normalized = value.trim().toLowerCase().slice(0, 80);
  if (!/^[a-z0-9_]+$/.test(normalized))
    throw new Error(
      "Output type must use lowercase letters, numbers, and underscores only.",
    );
  return normalized;
}
function parseStorageBucket(value: string): string {
  const normalized = value.trim().slice(0, 100);
  if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(normalized)) {
    throw new Error(
      "Storage bucket must use lowercase letters, numbers, dots, underscores, or hyphens.",
    );
  }
  return normalized;
}

function parseStoragePath(value: string): string {
  const normalized = value
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .slice(0, 1024);
  const segments = normalized.split("/");
  if (
    normalized.length === 0 ||
    normalized.includes("//") ||
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    ) ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error(
      "Storage prefix be a relative object path without empty, current, or parent segments.",
    );
  }
  return normalized;
}

function parseStatus(value: string): OutputStatus {
  if (["draft", "ready", "approved", "published", "archived"].includes(value))
    return value as OutputStatus;
  throw new Error("Invalid output status.");
}

async function assertPlatformAdmin() {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin")
    throw new Error("Only platform admins can manage survey outputs.");
  return profile;
}

async function loadOutput(outputId: string): Promise<OutputRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("survey_outputs")
    .select(
      "id, survey_id, output_type, status, is_current, storage_bucket, storage_path",
    )
    .eq("id", outputId)
    .maybeSingle();
  if (error)
    throw new Error("Failed to verify survey output.", { cause: error });
  if (!data) throw new Error("Survey output not found.");
  return data as OutputRow;
}

async function assertSurveyExists(surveyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("surveys")
    .select("id")
    .eq("id", surveyId)
    .maybeSingle();
  if (error) throw new Error("Failed to verify survey.", { cause: error });
  if (!data) throw new Error("Survey not found.");
}

function revalidateOutputPaths(outputId: string, surveyId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/outputs");
  revalidatePath(`/admin/outputs/${outputId}`);
  revalidatePath(`/admin/surveys/${surveyId}`);
}

export async function createOutput(formData: FormData) {
  const actor = await assertPlatformAdmin();
  const surveyId = readRequiredString(formData, "surveyId");
  await assertSurveyExists(surveyId);

  const supabase = await createClient();
  const outputsTable = supabase.from(
    "survey_outputs",
  ) as unknown as OutputInsertTable;
  const { data, error } = await outputsTable
    .insert({
      survey_id: surveyId,
      output_type: parseOutputType(readRequiredString(formData, "outputType")),
      title: readOptionalString(formData, "title", 200),
      description: readOptionalString(formData, "description"),
      status: "draft",
      is_current: false,
      created_by: actor.id,
    })
    .select("id")
    .single();
  if (error)
    throw new Error("Failed to create survey output.", { cause: error });

  revalidatePath("/admin");
  revalidatePath("/admin/outputs");
  revalidatePath(`/admin/surveys/${surveyId}`);
  if (!data?.id) redirect("/admin/outputs");
  redirect(`/admin/outputs/${data.id}`);
}

export async function updateOutput(formData: FormData) {
  await assertPlatformAdmin();
  const outputId = readRequiredString(formData, "outputId");
  const output = await loadOutput(outputId);
  if (lockedStatuses.has(output.status))
    throw new Error(`${output.status} outputs are locked.`);

  const surveyId = readRequiredString(formData, "surveyId");
  const outputType = parseOutputType(
    readRequiredString(formData, "outputType"),
  );
  await assertSurveyExists(surveyId);
  if (
    output.is_current &&
    (surveyId !== output.survey_id || outputType !== output.output_type)
  ) {
    throw new Error("A current output cannot change survey or output type.");
  }

  const supabase = await createClient();
  const outputsTable = supabase.from(
    "survey_outputs",
  ) as unknown as OutputUpdateTable;
  const { error } = await outputsTable
    .update({
      survey_id: surveyId,
      output_type: outputType,
      title: readOptionalString(formData, "title", 200),
      description: readOptionalString(formData, "description"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", outputId);
  if (error)
    throw new Error("Failed to update survey output.", { cause: error });

  revalidateOutputPaths(outputId, output.survey_id);
  if (surveyId !== output.survey_id)
    revalidatePath(`/admin/surveys/${surveyId}`);
}

export async function updateOutputStorageReference(formData: FormData) {
  await assertPlatformAdmin();
  const outputId = readRequiredString(formData, "outputId");
  const output = await loadOutput(outputId);
  if (lockedStatuses.has(output.status))
    throw new Error(`${output.status} outputs are locked.`);

  const supabase = await createClient();
  const outputsTable = supabase.from(
    "survey_outputs",
  ) as unknown as OutputUpdateTable;
  const { error } = await outputsTable
    .update({
      storage_bucket: parseStorageBucket(
        readRequiredString(formData, "storageBucket"),
      ),
      storage_path: parseStoragePath(
        readRequiredString(formData, "storagePath"),
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("id", outputId);
  if (error)
    throw new Error("Failed to update output storage reference.", {
      cause: error,
    });

  revalidateOutputPaths(outputId, output.survey_id);
}

export async function transitionOutputStatus(formData: FormData) {
  await assertPlatformAdmin();
  const outputId = readRequiredString(formData, "outputId");
  const nextStatus = parseStatus(readRequiredString(formData, "nextStatus"));
  const output = await loadOutput(outputId);

  if (!allowedTransitions[output.status].includes(nextStatus)) {
    throw new Error(
      `Cannot move an output from ${output.status} to ${nextStatus}.`,
    );
  }
  if (
    ["ready", "approved"].includes(nextStatus) &&
    (!output.storage_bucket?.trim() || !output.storage_path?.trim())
  ) {
    throw new Error(
      "Storage bucket and prefix/key are required before this output can become ready or approved.",
    );
  }

  const supabase = await createClient();
  const outputsTable = supabase.from(
    "survey_outputs",
  ) as unknown as OutputUpdateTable;
  const { error } = await outputsTable
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", outputId);
  if (error)
    throw new Error("Failed to update output status.", { cause: error });
  revalidateOutputPaths(outputId, output.survey_id);
}

export async function setCurrentOutput(formData: FormData) {
  await assertPlatformAdmin();
  const outputId = readRequiredString(formData, "outputId");
  const output = await loadOutput(outputId);
  if (!["ready", "approved"].includes(output.status))
    throw new Error("Only ready or approved outputs can be current.");

  const supabase = (await createClient()) as unknown as OutputRpcClient;
  const { error } = await supabase.rpc("admin_set_current_survey_output", {
    target_output_id: outputId,
  });
  if (error)
    throw new Error("Failed to select current output.", { cause: error });
  revalidateOutputPaths(outputId, output.survey_id);
}
