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
  const next = searchParams.get("next");

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let role: "platform_admin" | "user" | null = null;

      if (user) {
        const { data: profile, error: profileError } = (await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()) as {
          data: Pick<Tables<"profiles">, "role"> | null;
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
      }

      redirect(resolvePostAuthRedirectPath({ role, next }));
    }
  }

  redirect("/error");
}
