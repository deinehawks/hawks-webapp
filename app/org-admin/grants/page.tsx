import {
  EmptyState,
  OrgAdminPage,
  OrgAdminSection,
  selectClassName,
  StatusBadge,
  SubmitButton,
  TextField,
} from "@/components/org-admin/org-admin-ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createOrgAdminFarmGrant,
  createOrgAdminSurveyGrant,
  setOrgAdminFarmGrantStatus,
  setOrgAdminSurveyGrantStatus,
} from "@/lib/actions/org-admin";
import type { Tables } from "@/lib/database.types";
import { getOrgAdminContext } from "@/lib/org-admin/context";
import { createClient } from "@/utils/supabase/server";

type MemberOption = {
  profile_id: string;
  profile: Pick<Tables<"profiles">, "email" | "first_name" | "last_name"> | null;
};

function memberLabel(member: MemberOption): string {
  const name = [member.profile?.first_name, member.profile?.last_name]
    .filter(Boolean)
    .join(" ");
  return name
    ? `${name} (${member.profile?.email ?? member.profile_id})`
    : member.profile?.email ?? member.profile_id;
}

export default async function OrgAdminGrantsPage() {
  const { organization } = await getOrgAdminContext();
  const supabase = await createClient();

  const [membersResult, farmLinksResult, surveyLinksResult, farmGrantsResult, surveyGrantsResult] =
    await Promise.all([
      supabase
        .from("organization_memberships")
        .select(
          "profile_id, profile:profiles!organization_memberships_profile_id_fkey(email, first_name, last_name)",
        )
        .eq("organization_id", organization.id)
        .eq("role", "member")
        .eq("status", "active"),
      supabase
        .from("farm_organizations")
        .select("farm_id")
        .eq("organization_id", organization.id)
        .eq("review_status", "confirmed"),
      supabase
        .from("survey_organizations")
        .select("survey_id")
        .eq("organization_id", organization.id)
        .eq("review_status", "confirmed"),
      supabase
        .from("farm_access_grants")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("survey_access_grants")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
    ]);

  const firstError = [
    membersResult.error,
    farmLinksResult.error,
    surveyLinksResult.error,
    farmGrantsResult.error,
    surveyGrantsResult.error,
  ].find(Boolean);
  if (firstError) throw new Error("Failed to load organization access grants.", { cause: firstError });

  const members = (membersResult.data ?? []) as MemberOption[];
  const farmIds = (farmLinksResult.data ?? []).map((link) => link.farm_id);
  const surveyIds = (surveyLinksResult.data ?? []).map((link) => link.survey_id);
  const [farmsResult, surveysResult] = await Promise.all([
    farmIds.length
      ? supabase.from("farms").select("id, name, code").in("id", farmIds).order("name")
      : Promise.resolve({ data: [], error: null }),
    surveyIds.length
      ? supabase.from("surveys").select("id, location").in("id", surveyIds).order("id")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (farmsResult.error || surveysResult.error) {
    throw new Error("Failed to load grant resource options.", {
      cause: farmsResult.error ?? surveysResult.error,
    });
  }

  const farms = farmsResult.data ?? [];
  const surveys = surveysResult.data ?? [];
  const memberLabels = new Map(members.map((member) => [member.profile_id, memberLabel(member)]));
  const farmLabels = new Map(farms.map((farm) => [farm.id, farm.code ? `${farm.name} (${farm.code})` : farm.name]));
  const surveyLabels = new Map(surveys.map((survey) => [survey.id, survey.location ? `${survey.id} — ${survey.location}` : survey.id]));

  return (
    <OrgAdminPage
      title="Access grants"
      description="Grant active ordinary members access only to confirmed resources in this organization."
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <OrgAdminSection
          title="Grant farm access"
          description="A farm grant exposes only the selected farm."
        >
          <GrantForm
            action={createOrgAdminFarmGrant}
            members={members}
            resourceName="farmId"
            resources={farms.map((farm) => ({ value: farm.id, label: farmLabels.get(farm.id) ?? farm.id }))}
          />
        </OrgAdminSection>
        <OrgAdminSection
          title="Grant survey access"
          description="A survey grant exposes the selected survey and its authorized outputs."
        >
          <GrantForm
            action={createOrgAdminSurveyGrant}
            members={members}
            resourceName="surveyId"
            resources={surveys.map((survey) => ({ value: survey.id, label: surveyLabels.get(survey.id) ?? survey.id }))}
          />
        </OrgAdminSection>
      </div>

      <OrgAdminSection title="Farm grant history">
        <GrantTable
          grants={farmGrantsResult.data ?? []}
          resourceKey="farm_id"
          resourceLabels={farmLabels}
          memberLabels={memberLabels}
          action={setOrgAdminFarmGrantStatus}
        />
      </OrgAdminSection>
      <OrgAdminSection title="Survey grant history">
        <GrantTable
          grants={surveyGrantsResult.data ?? []}
          resourceKey="survey_id"
          resourceLabels={surveyLabels}
          memberLabels={memberLabels}
          action={setOrgAdminSurveyGrantStatus}
        />
      </OrgAdminSection>
    </OrgAdminPage>
  );
}

function GrantForm({
  action,
  members,
  resourceName,
  resources,
}: {
  action: (formData: FormData) => Promise<void>;
  members: MemberOption[];
  resourceName: "farmId" | "surveyId";
  resources: { value: string; label: string }[];
}) {
  if (!members.length || !resources.length) {
    return <EmptyState>An active ordinary member and confirmed resource are required.</EmptyState>;
  }
  return (
    <form action={action} className="space-y-4">
      <select name="profileId" className={selectClassName} aria-label="Member">
        {members.map((member) => (
          <option key={member.profile_id} value={member.profile_id}>
            {memberLabel(member)}
          </option>
        ))}
      </select>
      <select name={resourceName} className={selectClassName} aria-label="Resource">
        {resources.map((resource) => (
          <option key={resource.value} value={resource.value}>
            {resource.label}
          </option>
        ))}
      </select>
      <TextField name="reason" label="Reason" />
      <SubmitButton>Grant access</SubmitButton>
    </form>
  );
}

type GrantRow = Pick<
  Tables<"farm_access_grants">,
  "id" | "profile_id" | "status" | "reason"
> & {
  farm_id?: string;
  survey_id?: string;
};

function GrantTable({
  grants,
  resourceKey,
  resourceLabels,
  memberLabels,
  action,
}: {
  grants: GrantRow[];
  resourceKey: "farm_id" | "survey_id";
  resourceLabels: Map<string, string>;
  memberLabels: Map<string, string>;
  action: (formData: FormData) => Promise<void>;
}) {
  if (!grants.length) return <EmptyState>No grant history is available.</EmptyState>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Resource</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {grants.map((grant) => {
          const resourceId = grant[resourceKey] ?? "";
          const nextStatus = grant.status === "active" ? "revoked" : "active";
          return (
            <TableRow key={grant.id}>
              <TableCell>{memberLabels.get(grant.profile_id) ?? grant.profile_id}</TableCell>
              <TableCell>{resourceLabels.get(resourceId) ?? resourceId}</TableCell>
              <TableCell><StatusBadge value={grant.status} /></TableCell>
              <TableCell>{grant.reason ?? "—"}</TableCell>
              <TableCell className="text-right">
                <form action={action}>
                  <input type="hidden" name="grantId" value={grant.id} />
                  <input type="hidden" name="nextStatus" value={nextStatus} />
                  <SubmitButton variant={nextStatus === "revoked" ? "destructive" : "outline"}>
                    {nextStatus === "revoked" ? "Revoke" : "Reactivate"}
                  </SubmitButton>
                </form>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

