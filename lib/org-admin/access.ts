import "server-only";

import { cache } from "react";

import type { Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type Organization = Tables<"organizations">;

export type OrgAdminAccessResolution =
  | { status: "none" }
  | { status: "ambiguous" }
  | {
      status: "active";
      membershipId: string;
      organization: Organization;
    };

export const resolveOrgAdminAccess = cache(
  async (profileId: string): Promise<OrgAdminAccessResolution> => {
    const supabase = await createClient();
    const { data: memberships, error: membershipError } = await supabase
      .from("organization_memberships")
      .select("id, organization_id")
      .eq("profile_id", profileId)
      .eq("role", "org_admin")
      .eq("status", "active")
      .limit(2);

    if (membershipError) {
      throw new Error("Failed to resolve organization administrator access.", {
        cause: membershipError,
      });
    }
    if (!memberships || memberships.length === 0) {
      return { status: "none" };
    }
    if (memberships.length !== 1) {
      return { status: "ambiguous" };
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
      return { status: "none" };
    }

    return {
      status: "active",
      membershipId: membership.id,
      organization,
    };
  },
);
