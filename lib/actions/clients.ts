"use server";

import {
  getAuthenticatedUserContext,
  requireAccessibleClientByCode,
} from "@/lib/auth/user-context";
import { createClient } from "@/utils/supabase/server";

export async function getAllClients() {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin" && !profile.organization_id) {
    return [];
  }

  const supabase = await createClient();
  let query = supabase.from("clients").select("*").order("code");

  if (profile.role !== "platform_admin") {
    query = query.eq("id", profile.organization_id!);
  }

  const { data: clients, error } = await query;

  if (error) {
    throw new Error("Failed to fetch client data");
  }

  return clients;
}

export async function getAccessibleClient(code: string) {
  return requireAccessibleClientByCode(code);
}
