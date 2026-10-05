"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signup(_form_data: { email: string; password: string }) {
  return { error: { message: "Recording uses an existing approved account. Account creation is unavailable here." } };
}

export async function login(form_data: { email: string; password: string }) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: form_data.email,
    password: form_data.password,
  });

  if (error) {
    return { error: error.message };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.account_status !== "active") {
    await supabase.auth.signOut();
    return {
      error: profileError
        ? "Unable to verify this account. Please try again."
        : "This account is not active. Ask a platform administrator to approve it.",
    };
  }

  // Revalidate all routes to clear any cached data
  revalidatePath("/", "layout");

  // Server-side redirect after successful login
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error };
  }

  revalidatePath("/", "layout");
  redirect("/auth/login");
}

export async function getUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return { error };
  }

  return { user };
}
