"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getUserProfile } from "./profiles";
import path from "path";
import { getSurveyMaxZoom } from "@/lib/helpers/get-max-zoom";

function isTransientNetworkError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return /fetch failed|ECONNRESET|terminated|network|socket|timed out|timeout/i.test(
    message,
  );
}

export async function getUserSurvey(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  let userProfile;
  try {
    userProfile = await getUserProfile(user.id);
  } catch (error) {
    if (isTransientNetworkError(error)) {
      throw new Error(
        "Survey data is temporarily unavailable. Please try again.",
      );
    }
    throw error;
  }

  const { access_code } = userProfile;

  const { data: survey, error } = await supabase
    .from("surveys")
    .select("*, ortho(*), point_cloud(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isTransientNetworkError(error)) {
      throw new Error(
        "Survey data is temporarily unavailable. Please try again.",
      );
    }
    throw new Error("Failed to fetch survey data.");
  }

  if (!survey) {
    throw new Error("Survey not found.");
  }

  if (survey.code !== access_code) {
    throw new Error("Access denied to this survey data.");
  }

  return survey;
}

export async function getAllUserSurveys() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  let userProfile;
  try {
    userProfile = await getUserProfile(user.id);
  } catch (error) {
    if (isTransientNetworkError(error)) {
      console.error("User profile fetch failed temporarily:", error);
      return [];
    }
    throw error;
  }

  const { access_code } = userProfile;

  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("*, ortho(*)")
    .eq("access_code", access_code)
    .order("id");

  if (error) {
    if (isTransientNetworkError(error)) {
      console.error("Survey list fetch failed temporarily:", error);
      return [];
    }
    throw new Error("Failed to fetch survey data.");
  }

  const root = path.join(process.cwd(), "public", "tiles");

  const updatedSurveys = (surveys ?? []).map((survey) => {
    const folderPath = path.join(
      root,
      survey.code.toLowerCase(),
      String(new Date(survey.flight_date).getFullYear()),
      survey.id,
      "ortho",
      survey.ortho?.tile_folder ?? "round-corners",
    );

    const maxZoom = getSurveyMaxZoom(folderPath);

    return {
      ...survey,
      max_zoom: maxZoom,
    };
  });

  return updatedSurveys;
}

export async function getObjectDetectionData(id?: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  let userProfile;
  try {
    userProfile = await getUserProfile(user.id);
  } catch (error) {
    if (isTransientNetworkError(error)) {
      console.error("User profile fetch failed temporarily:", error);
      return [];
    }
    throw error;
  }

  const { access_code } = userProfile;

  if (!access_code) {
    redirect("/error");
  }

  try {
    const { data: detectedObjects, error } = await supabase.storage
      .from("detected-objects")
      .download(`${access_code.toLowerCase()}.json`);

    if (error || !detectedObjects) {
      console.error("Object detection JSON unavailable:", error);
      return [];
    }

    const jsonString = await detectedObjects.text();

    if (!jsonString.trim()) {
      return [];
    }

    const jsonObject = JSON.parse(jsonString);

    if (id) {
      return jsonObject.filter((object: any) => object.areaCode === id);
    }

    return jsonObject;
  } catch (error) {
    if (isTransientNetworkError(error)) {
      console.error("Object detection JSON fetch failed temporarily:", error);
      return [];
    }

    console.error("Failed to load object detection JSON:", error);
    return [];
  }
}
