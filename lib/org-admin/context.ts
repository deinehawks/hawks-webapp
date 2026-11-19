import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Tables } from "@/lib/database.types";
import { resolveOrgAdminAccess } from "@/lib/org-admin/access";

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

  const access = await resolveOrgAdminAccess(user.id);
  if (access.status === "none") {
    redirect("/dashboard");
  }
  if (access.status === "ambiguous") {
    throw new Error(
      "Organization administrator access is ambiguous. Contact a platform administrator.",
    );
  }

  return {
    user,
    profile,
    membershipId: access.membershipId,
    organization: access.organization,
  };
});

