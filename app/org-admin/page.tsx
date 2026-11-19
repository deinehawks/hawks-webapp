import Link from "next/link";

import {
  OrgAdminPage,
  OrgAdminSection,
  StatusBadge,
} from "@/components/org-admin/org-admin-ui";
import { Button } from "@/components/ui/button";
import { getOrgAdminContext } from "@/lib/org-admin/context";
import { createClient } from "@/utils/supabase/server";

export default async function OrgAdminOverviewPage() {
  const { organization } = await getOrgAdminContext();
  const supabase = await createClient();

  const [members, farms, surveys, requests] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .neq("status", "removed"),
    supabase
      .from("farm_organizations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("review_status", "confirmed"),
    supabase
      .from("survey_organizations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("review_status", "confirmed"),
    supabase
      .from("organization_user_requests")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("status", "pending"),
  ]);

  const firstError = [members.error, farms.error, surveys.error, requests.error].find(Boolean);
  if (firstError) {
    throw new Error("Failed to load organization overview.", { cause: firstError });
  }

  const metrics = [
    { label: "Members", value: members.count ?? 0, href: "/org-admin/members" },
    { label: "Confirmed farms", value: farms.count ?? 0, href: "/org-admin/farms" },
    { label: "Confirmed surveys", value: surveys.count ?? 0, href: "/org-admin/surveys" },
    { label: "Pending onboarding", value: requests.count ?? 0, href: "/org-admin/onboarding" },
  ];

  return (
    <OrgAdminPage
      title={organization.name}
      description="Manage your organization and its confirmed resources within platform-approved boundaries."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <OrgAdminSection key={metric.label} title={metric.label}>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-semibold">{metric.value}</span>
              <Button variant="outline" size="sm" asChild>
                <Link href={metric.href}>Open</Link>
              </Button>
            </div>
          </OrgAdminSection>
        ))}
      </div>
      <OrgAdminSection
        title="Organization status"
        description="Status is controlled by platform administrators and cannot be changed here."
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge value={organization.status} />
          <span className="text-sm text-muted-foreground">
            Code: {organization.code ?? "Not assigned"} · Type: {organization.type_code}
          </span>
        </div>
      </OrgAdminSection>
    </OrgAdminPage>
  );
}

