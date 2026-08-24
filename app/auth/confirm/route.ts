import { type EmailOtpType, type PostgrestError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { resolvePostAuthRedirectPath } from "@/lib/auth/post-auth-redirect";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  const supabase = await createClient();
  let verificationError: Error | null = null;

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    verificationError = error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verificationError = error;
  } else {
    redirect("/error");
  }

  if (!verificationError) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let role: "platform_admin" | "user" | null = null;
    let accountStatus: "pending" | "active" | "rejected" | null = null;

    if (user) {
      const { data: profile, error: profileError } = (await supabase
        .from("profiles")
        .select("role, account_status")
        .eq("id", user.id)
        .maybeSingle()) as {
        data: Pick<Tables<"profiles">, "role" | "account_status"> | null;
        error: PostgrestError | null;
      };

      if (profileError) {
        throw new Error("Failed to resolve authenticated account role.", {
          cause: profileError,
        });
      }

      role = profile?.role === "platform_admin" || profile?.role === "user"
        ? profile.role
        : null;
      accountStatus = profile?.account_status === "pending"
        || profile?.account_status === "active"
        || profile?.account_status === "rejected"
        ? profile.account_status
        : null;
    }

    redirect(resolvePostAuthRedirectPath({ role, accountStatus, next }));
  }

  redirect("/error");
}
