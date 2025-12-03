"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getUserProfile } from "./profiles";

export async function getUserSurvey(id: string) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const userProfile = await getUserProfile(user.id);
  const { access_code } = userProfile;

  const { data: survey, error } = await supabase
    .from("surveys")
    .select("*, ortho(*), point_cloud(*)")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error("Failed to fetch survey data.");
  }

  if (survey.code !== access_code) {
    throw new Error("Access denied to this survey data.");
  }

  return survey;
}
