import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const requireRecordingAccount = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/login");
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profileError || !profile || profile.account_status !== "active") {
    await supabase.auth.signOut();
    redirect("/auth/login?error=account-inactive");
  }
  return { supabase, user, profile };
});

export const requireRecordingAdmin = cache(async () => {
  const context = await requireRecordingAccount();
  if (context.profile.role !== "platform_admin") {
    notFound();
  }
  return context;
});
