import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type Organization = Tables<"organizations">;

export type OrgAdminContext = {
  user: Awaited<ReturnType<typeof getAuthenticatedUserContext>>["user"];
  profile: Awaited<ReturnType<typeof getAuthenticatedUserContext>>["profile"];
  membershipId: string;
  organization: Organization;
};

export const getOrgAdminContext = cache(async (): Promise<OrgAdminContext> => {
  const { user, profile } = await getAuthenticatedUserContext();

  if (profile.account_status && profile.account_status !== "active") {
    redirect("/account/pending");
  }
  if (profile.role === "platform_admin") {
    redirect("/admin");
  }
  if (profile.role !== "user") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("id, organization_id")
    .eq("profile_id", user.id)
    .eq("role", "org_admin")
    .eq("status", "active")
    .limit(2);

  if (membershipError) {
    throw new Error("Failed to resolve organization administrator access.", {
      cause: membershipError,
    });
  }
  if (!memberships || memberships.length === 0) {
    redirect("/dashboard");
  }
  if (memberships.length !== 1) {
    throw new Error(
      "Organization administrator access is ambiguous. Contact a platform administrator.",
    );
  }

  const membership = memberships[0];
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .eq("status", "active")
    .maybeSingle();

  if (organizationError) {
    throw new Error("Failed to load the managed organization.", {
      cause: organizationError,
    });
  }
  if (!organization) {
    redirect("/dashboard");
  }

  return {
    user,
    profile,
    membershipId: membership.id,
    organization,
  };
});

