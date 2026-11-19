"use server";

import {
  getAuthenticatedUserContext,
  requireAccessibleClientByCode,
  listAccessibleClients,
} from "@/lib/auth/user-context";
import { createClient } from "@/utils/supabase/server";
import { filterWorkshopClients } from "@/lib/workshop-visibility";

export async function getAllClients() {
  await getAuthenticatedUserContext();

  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("code");

  if (error) {
    throw new Error("Failed to fetch client data");
  }

  return filterWorkshopClients(clients ?? []);
}

export async function getAccessibleClient(code: string) {
  return requireAccessibleClientByCode(code);
}

export async function getDefaultAccessibleClient() {
  const clients = await listAccessibleClients();
  return clients[0] ?? null;
}
