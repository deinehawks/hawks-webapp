"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserProfile } from "./profiles";
import { redirect } from "next/navigation";

import path from "path";
import { getSurveyMaxZoom } from "@/lib/helpers/get-max-zoom";

export async function getAllUserSurveys() {
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

  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("*")
    .eq("access_code", access_code)
    .order("id");

  if (error) {
    throw new Error("Failed to fetch survey data.");
  }

  const root = path.join(process.cwd(), "public", "asimov-hawks", "tiles");

  const updatedSurveys = surveys.map((survey) => {
    const folderPath = path.join(
      root,
      survey.code.toLowerCase(),
      String(new Date(survey.flight_date).getFullYear()),
      survey.id,
      "ortho",
      "sharp-corners"
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

  if (!access_code) {
    redirect("/error");
  }

  const { data: detected_objects, error } = await supabase.storage
    .from("detected-objects")
    .download(`${access_code?.toLowerCase()}.json`);

  if (error) {
    // Return empty array instead of throwing error
    console.log("No object detection data found yet");
    return [];
  }

  const arrayBuffer = await detected_objects.arrayBuffer();
  const jsonString = new TextDecoder("utf-8").decode(arrayBuffer);
  const jsonObject = JSON.parse(jsonString);

  if (id) {
    const filteredData = jsonObject.filter(
      (object: any) => object.areaCode === id
    );
    return filteredData;
  }

  return jsonObject;
}
