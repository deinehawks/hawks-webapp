"use server";
import { loadRecordingSurveys } from "@/lib/recording/surveys";
export async function getAllClients() {
  const surveys = await loadRecordingSurveys();
  return [...new Map(surveys.filter((s) => s.client).map((s) => [s.client!.id, s.client!])).values()];
}
