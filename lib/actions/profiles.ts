"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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
      .select("*, organization(*)")
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

    return profile;
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
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return getUserProfile(user.id);
}
