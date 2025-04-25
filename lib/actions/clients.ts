"use server";

import { createClient } from "@/utils/supabase/server";

export async function getAllClients() {
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("code");

  if (error) {
    throw new Error("Failed to fetch client data");
  }

  return clients;
}
