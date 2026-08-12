"use server";

import {
  getAuthenticatedUserContext,
  requireAccessibleClientByCode,
  listAccessibleClients,
} from "@/lib/auth/user-context";
import { createClient } from "@/utils/supabase/server";

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

  return clients ?? [];
}

export async function getAccessibleClient(code: string) {
  return requireAccessibleClientByCode(code);
}

export async function getDefaultAccessibleClient() {
  const clients = await listAccessibleClients();
  return clients[0] ?? null;
}
