"use server";

import { createClient } from "@/utils/supabase/server";
import { getUser } from "./auth";
import { getUserProfile } from "./profiles";
import { redirect } from "next/navigation";

export async function getAllUserSurveys() {
  const supabase = await createClient();

  const user = await getUser();

  if (user && user.role === "authenticated") {
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

    return surveys;
  }
}

export async function getObjectDetectionData(id?: string) {
  const supabase = await createClient();

  const user = await getUser();

  if (user && user.role === "authenticated") {
    const userProfile = await getUserProfile(user.id);

    const { access_code } = userProfile;

    if (!access_code) {
      redirect("/error");
    }

    const { data: detected_objects, error } = await supabase.storage
      .from("detected-objects")
      .download(`${access_code?.toLowerCase()}.json`);

    if (error) {
      throw new Error("Failed to fetch object detection data.");
    }

    const arrayBuffer = await detected_objects.arrayBuffer();
    const jsonString = new TextDecoder("utf-8").decode(arrayBuffer);
    const jsonObject = JSON.parse(jsonString);

    if (id) {
      const filteredData = jsonObject.filter(
        (object) => object.areaCode === id
      );

      return filteredData;
    }

    return jsonObject;
  }
}
