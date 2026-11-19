"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Json } from "@/lib/database.types";
import {
  datasetOnboardingCommitSchema,
  datasetOnboardingInputSchema,
  datasetOnboardingPreviewSchema,
  type DatasetOnboardingActionResult,
  type DatasetOnboardingCommit,
  type DatasetOnboardingPreview,
} from "@/lib/dataset-onboarding";
import { createClient } from "@/utils/supabase/server";

type DatasetOnboardingRpcName =
  | "platform_admin_preview_dataset_onboarding"
  | "platform_admin_commit_dataset_onboarding";
type DatasetOnboardingRpcClient = {
  rpc(
    functionName: DatasetOnboardingRpcName,
    args: { onboarding_payload: Json },
  ): PromiseLike<{ data: Json | null; error: PostgrestError | null }>;
};

async function assertPlatformAdmin() {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin") {
    throw new Error("Only platform admins can onboard datasets.");
  }
}

export async function previewDatasetOnboarding(
  input: unknown,
): Promise<DatasetOnboardingActionResult<DatasetOnboardingPreview>> {
  await assertPlatformAdmin();
  const parsedInput = datasetOnboardingInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "Check the required client, owner, farm, and survey ID fields." };
  }
  const supabase = (await createClient()) as unknown as DatasetOnboardingRpcClient;
  const { data, error } = await supabase.rpc(
    "platform_admin_preview_dataset_onboarding",
    { onboarding_payload: parsedInput.data as Json },
  );
  if (error) {
    return { ok: false, error: "The onboarding preview could not be generated." };
  }
  const preview = datasetOnboardingPreviewSchema.safeParse(data);
  if (!preview.success) {
    return { ok: false, error: "The onboarding preview response was invalid." };
  }
  return { ok: true, data: preview.data };
}

export async function commitDatasetOnboarding(
  input: unknown,
): Promise<DatasetOnboardingActionResult<DatasetOnboardingCommit>> {
  await assertPlatformAdmin();
  const parsedInput = datasetOnboardingInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "Check the required client, owner, farm, and survey ID fields." };
  }

  const supabase = (await createClient()) as unknown as DatasetOnboardingRpcClient;
  const { data, error } = await supabase.rpc(
    "platform_admin_commit_dataset_onboarding",
    { onboarding_payload: parsedInput.data as Json },
  );
  if (error) {
    return {
      ok: false,
      error: error.code === "22023"
        ? "The data changed after preview. Review the batch again."
        : "The onboarding batch could not be committed.",
    };
  }
  const committed = datasetOnboardingCommitSchema.safeParse(data);
  if (!committed.success) {
    return { ok: false, error: "The onboarding commit response was invalid." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/surveys");
  revalidatePath("/admin/farms");
  return { ok: true, data: committed.data };
}
