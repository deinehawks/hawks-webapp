"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { resolveAuthenticatedHomePath } from "@/lib/auth/post-auth-redirect";
import { createClient } from "@/utils/supabase/server";

export async function signup(form_data: { email: string; password: string }) {
  const supabase = await createClient();

  const { error, data } = await supabase.auth.signUp({
    email: form_data.email,
    password: form_data.password,
  });

  if (error) {
    return { error };
  }

  revalidatePath("/", "layout");

  return { data };
}

export async function login(form_data: { email: string; password: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: form_data.email,
    password: form_data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(await resolveAuthenticatedHomePath());
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
