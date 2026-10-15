"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getUserProfile } from "./profiles";
import path from "node:path";
import { getWorkshopDataDirectory } from "@/lib/workshop-files";
import { resolveSurveyTileFolder } from "@/lib/helpers/resolve-survey-tile-folder";
import { isWorkshopSurveyIdVisible, isWorkshopSurveyVisible } from "@/lib/workshop-visibility";

export async function getUserSurvey(id: string) {
  if (!isWorkshopSurveyIdVisible(id)) notFound();
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

  if (!isWorkshopSurveyVisible(survey.code, survey.id)) notFound();

  if (!survey.ortho) return survey;

  const tileFolder = resolveSurveyTileFolder(
    path.join(
      getWorkshopDataDirectory("tiles"),
      survey.code.toLowerCase(),
      String(new Date(survey.flight_date).getFullYear()),
      String(survey.id),
      "ortho",
    ),
    survey.ortho.tile_folder,
  );

  return {
    ...survey,
    ortho: { ...survey.ortho, tile_folder: tileFolder },
  };
}
