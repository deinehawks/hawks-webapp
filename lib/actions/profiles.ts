"use server";

import { createClient } from "@/utils/supabase/server";

export async function getUserProfile(id) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*, organization(*)")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error("Failed to fetch user profile.");
  }

  return profile;
}
