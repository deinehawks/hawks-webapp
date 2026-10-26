"use server";
import { loadRecordingSurveys } from "@/lib/recording/surveys";
import { filterWorkshopClients } from "@/lib/workshop-visibility";

export async function getAllClients() {
  const surveys = await loadRecordingSurveys();
  const clients = [
    ...new Map(
      surveys
        .filter((survey) => survey.client)
        .map((survey) => [survey.client!.id, survey.client!]),
    ).values(),
  ];
  return filterWorkshopClients(clients);
}
