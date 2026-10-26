"use server";
import { loadRecordingSurveys } from "@/lib/recording/surveys";
import { isWorkshopSurveyVisible } from "@/lib/workshop-visibility";

export async function getUserSurvey(id: string) {
  const survey = (await loadRecordingSurveys()).find((item) => item.id === id);
  return survey && isWorkshopSurveyVisible(survey.code, survey.id)
    ? survey
    : null;
}
