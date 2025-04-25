"use server";

import { createClient } from "@/utils/supabase/server";
import { getUser } from "./auth";
import { redirect } from "next/navigation";
import { getUserProfile } from "./profiles";

export async function getUserSurvey(id: string) {
  const supabase = await createClient();

  const user = await getUser();
  if (user && user.role === "authenticated") {
    const userProfile = await getUserProfile(user.id);
    const { access_code } = userProfile;

    const { data: survey, error } = await supabase
      .from("surveys")
      .select("*, ortho(*)")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error("Failed to fetch survey data.");
    }

    if (survey.code === access_code) {
      return survey;
    } else {
      throw new Error("Access denied to this survey data.");
    }
  } else {
    throw new Error("User not authenticated.");
    redirect("/auth/login");
  }
}
