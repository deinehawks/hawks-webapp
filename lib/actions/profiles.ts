"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function getUserProfile(id: string) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*, organization(*)")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Failed to fetch user profile:", {
      userId: id,
      error: error.message,
      code: error.code,
      details: error.details,
    });

    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  return profile;
}

// Helper that gets current authenticated user's profile
export async function getCurrentUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return await getUserProfile(user.id);
}
