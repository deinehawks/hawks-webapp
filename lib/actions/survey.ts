"use server";
import { loadRecordingSurveys } from "@/lib/recording/surveys";

export async function getUserSurvey(id: string) {
  return (await loadRecordingSurveys()).find((item) => item.id === id) ?? null;
}
