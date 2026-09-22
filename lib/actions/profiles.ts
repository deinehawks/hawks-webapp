"use server";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Tables } from "@/lib/database.types";
import type { UserProfile } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

function isTransientNetworkError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return /fetch failed|ECONNRESET|terminated|network|socket|timeout|timed out/i.test(
    message,
  );
}

export async function getUserProfile(id: string) {
  const supabase = await createClient();

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch user profile:", {
        userId: id,
        error: error.message,
        code: error.code,
        details: error.details,
      });

      if (isTransientNetworkError(error.message)) {
        throw new Error(
          "User profile is temporarily unavailable. Please try again shortly.",
        );
      }

      throw error;
    }

    if (!profile) {
      throw new Error("User profile not found.");
    }

    const normalized = { ...(profile as Tables<"profiles">) } as Partial<
      Tables<"profiles">
    >;
    delete normalized.access_code;
    delete normalized.organization;

    return normalized as UserProfile;
  } catch (error) {
    console.error("Unexpected profile fetch error:", error);

    if (isTransientNetworkError(error)) {
      throw new Error(
        "Unable to connect to the server. Please try again in a few minutes.",
      );
    }

    throw error;
  }
}

export async function getCurrentUserProfile() {
  const { profile } = await getAuthenticatedUserContext();
  return profile;
}
