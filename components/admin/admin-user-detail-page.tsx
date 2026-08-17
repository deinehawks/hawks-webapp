import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye, History, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import type { PostgrestError } from "@supabase/supabase-js";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createOrganizationMembership,
  updateOrganizationMembershipRole,
  updateOrganizationMembershipStatus,
} from "@/lib/actions/admin-memberships";
import {
  createFarmAccessGrant,
  updateFarmAccessGrantStatus,
} from "@/lib/actions/admin-farm-grants";
import {
  createSurveyAccessGrant,
  updateSurveyAccessGrantStatus,
} from "@/lib/actions/admin-survey-grants";
import { formatAdminSurveyLabel } from "@/lib/admin/survey-labels";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Database, Json, Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type MembershipStatus = Database["public"]["Enums"]["membership_status"];

type GrantStatus = Database["public"]["Enums"]["access_grant_status"];
type ProfileRow = Pick<
  Tables<"profiles">,
  "id" | "email" | "first_name" | "last_name" | "role" | "person_id" | "created_at" | "updated_at"
>;
type MembershipRow = Pick<
  Tables<"organization_memberships">,
  "id" | "profile_id" | "organization_id" | "role" | "status" | "notes" | "invited_at" | "approved_at" | "removed_at" | "updated_at"
> & {
  organization: Pick<Tables<"organizations">, "id" | "name" | "type_code" | "status"> | null;
};
type SurveyGrantRow = Pick<
  Tables<"survey_access_grants">,
  "id" | "profile_id" | "survey_id" | "status" | "expires_at" | "reason" | "created_at" | "updated_at"
> & {
  survey: (Pick<Tables<"surveys">, "id" | "code" | "location" | "flight_date" | "client_id"> & {
    client: Pick<Tables<"clients">, "code" | "name"> | null;
  }) | null;
};
type FarmGrantRow = Pick<
  Tables<"farm_access_grants">,
  "id" | "profile_id" | "farm_id" | "status" | "expires_at" | "reason" | "created_at"
> & {
  farm: Pick<Tables<"farms">, "id" | "name" | "code" | "status"> | null;
};
type OrganizationOption = Pick<Tables<"organizations">, "id" | "name" | "type_code">;
type SurveyOption = Pick<Tables<"surveys">, "id" | "code" | "location" | "flight_date" | "client_id"> & {
  client: Pick<Tables<"clients">, "code" | "name"> | null;
};
type FarmOption = Pick<Tables<"farms">, "id" | "name" | "code" | "status">;
type AuditRow = Pick<
  Tables<"admin_audit_log">,
  "id" | "occurred_at" | "action" | "table_name" | "record_pk" | "old_data" | "new_data"
> & {
  actor: Pick<Tables<"profiles">, "email"> | null;
};

const membershipStatusTransitions = {
  invited: ["pending", "removed"],
  pending: ["active", "removed"],
  active: ["suspended", "removed"],
  suspended: ["active", "removed"],
  removed: [],
} as const satisfies Record<MembershipStatus, readonly MembershipStatus[]>;

function formatName(profile: ProfileRow): string {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    || profile.email
    || profile.id;
}

function formatLabel(value: string | null): string {
  if (!value) return "Not set";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatSurvey(survey: SurveyOption | SurveyGrantRow["survey"]): string {
  if (!survey) return "Unknown survey";
  return formatAdminSurveyLabel(survey);
}

function isEffectiveGrant(status: GrantStatus, expiresAt: string | null): boolean {
  return status === "active" && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
}

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recordId(value: Json): string | null {
  if (!isJsonObject(value)) return null;
  const id = value.id;
  return typeof id === "string" ? id : null;
}

function changedKeys(row: AuditRow): string {
  if (row.action === "INSERT") return "Created record";
  if (row.action === "DELETE") return "Deleted record";
  if (!isJsonObject(row.old_data) || !isJsonObject(row.new_data)) {
    return "Updated record";
  }

  const oldData = row.old_data;
  const newData = row.new_data;
  const keys = Object.keys(newData).filter((key) =>
    JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]),
  ).filter((key) => key !== "updated_at");

  if (keys.length === 0) return "Updated record";
  return `Changed ${keys.slice(0, 3).map((key) => formatLabel(key)).join(", ")}${keys.length > 3 ? ` +${keys.length - 3}` : ""}`;
}

function CreateMembershipForm({ profileId, organizations }: { profileId: string; organizations: OrganizationOption[] }) {
  return (
    <Card className="rounded-lg">
      <CardHeader><CardTitle className="text-base">Add organization membership</CardTitle></CardHeader>
      <CardContent>
        <form action={createOrganizationMembership} className="grid gap-4 md:grid-cols-2">
          <input name="profileId" type="hidden" value={profileId} />
          <label className="grid gap-2 text-sm font-medium">
            Organization
            <select className="h-9 rounded-md border bg-background px-3 text-sm" disabled={organizations.length === 0} name="organizationId" required>
              <option value="">{organizations.length === 0 ? "No active organizations" : "Select organization"}</option>
              {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} ({formatLabel(organization.type_code)})</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Membership role
            <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="viewer" name="role" required>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Initial status
            <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="pending" name="status" required>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium md:col-span-2">
            Notes
            <textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" maxLength={2000} name="membershipNotes" />
          </label>
          <div className="flex items-center justify-between gap-3 md:col-span-2">
            <p className="text-sm text-muted-foreground">Only viewer or editor access can be created here.</p>
            <Button disabled={organizations.length === 0} type="submit">Create membership</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function formatFarm(farm: FarmOption | FarmGrantRow["farm"]): string {
  if (!farm) return "Unknown farm";
  return farm.code ? `${farm.code} - ${farm.name}` : farm.name;
}

function CreateSurveyGrantForm({ profileId, surveys }: { profileId: string; surveys: SurveyOption[] }) {
  return (
    <Card className="rounded-lg">
      <CardHeader><CardTitle className="text-base">Add survey access grant</CardTitle></CardHeader>
      <CardContent>
        <form action={createSurveyAccessGrant} className="grid gap-4">
          <input name="profileId" type="hidden" value={profileId} />
          <label className="grid gap-2 text-sm font-medium">
            Survey
            <select className="h-9 rounded-md border bg-background px-3 text-sm" disabled={surveys.length === 0} name="surveyId" required>
              <option value="">{surveys.length === 0 ? "No surveys available" : "Select survey"}</option>
              {surveys.map((survey) => <option key={survey.id} value={survey.id}>{formatSurvey(survey)}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Reason
            <textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" maxLength={2000} name="surveyGrantReason" />
          </label>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">This exception grants only the selected survey.</p>
            <Button disabled={surveys.length === 0} type="submit">Create grant</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateFarmGrantForm({ farms, profileId }: { farms: FarmOption[]; profileId: string }) {
  return (
    <Card className="rounded-lg">
      <CardHeader><CardTitle className="text-base">Add farm access grant</CardTitle></CardHeader>
      <CardContent>
        <form action={createFarmAccessGrant} className="grid gap-4">
          <input name="profileId" type="hidden" value={profileId} />
          <label className="grid gap-2 text-sm font-medium">
            Farm
            <select className="h-9 rounded-md border bg-background px-3 text-sm" disabled={farms.length === 0} name="farmId" required>
              <option value="">{farms.length === 0 ? "No farms available" : "Select farm"}</option>
              {farms.map((farm) => <option key={farm.id} value={farm.id}>{formatFarm(farm)}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Reason
            <textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" maxLength={2000} name="farmGrantReason" />
          </label>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">This exception grants only the selected farm.</p>
            <Button disabled={farms.length === 0} type="submit">Create grant</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile: actor } = await getAuthenticatedUserContext();

  if (actor.role !== "platform_admin") redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();
  const [profileResponse, membershipsResponse, surveyGrantsResponse, farmGrantsResponse, organizationsResponse, surveysResponse, farmsResponse, auditResponse] = await Promise.all([
    supabase.from("profiles").select("id, email, first_name, last_name, role, person_id, created_at, updated_at").eq("id", id).maybeSingle(),
    supabase.from("organization_memberships").select("id, profile_id, organization_id, role, status, notes, invited_at, approved_at, removed_at, updated_at, organization:organizations!organization_memberships_organization_id_fkey(id, name, type_code, status)").eq("profile_id", id).order("updated_at", { ascending: false }),
    supabase.from("survey_access_grants").select("id, profile_id, survey_id, status, expires_at, reason, created_at, updated_at, survey:surveys!survey_access_grants_survey_id_fkey(id, code, location, flight_date, client_id, client:clients!surveys_client_id_fkey(code, name))").eq("profile_id", id).order("updated_at", { ascending: false }),
    supabase.from("farm_access_grants").select("id, profile_id, farm_id, status, expires_at, reason, created_at, farm:farms!farm_access_grants_farm_id_fkey(id, name, code, status)").eq("profile_id", id).order("updated_at", { ascending: false }),
    supabase.from("organizations").select("id, name, type_code").eq("status", "active").order("name"),
    supabase.from("surveys").select("id, code, location, flight_date, client_id, client:clients!surveys_client_id_fkey(code, name)").order("flight_date", { ascending: false, nullsFirst: false }),
    supabase.from("farms").select("id, name, code, status").eq("status", "active").order("name"),
    supabase.from("admin_audit_log").select("id, occurred_at, action, table_name, record_pk, old_data, new_data, actor:profiles!admin_audit_log_actor_profile_id_fkey(email)").in("table_name", ["organization_memberships", "survey_access_grants", "farm_access_grants"]).order("occurred_at", { ascending: false }).limit(100),
  ]);

  if (profileResponse.error) throw new Error("Failed to load the user account.", { cause: profileResponse.error });
  if (!profileResponse.data) notFound();

  const failures: Array<[string, PostgrestError | null]> = [
    ["memberships", membershipsResponse.error],
    ["survey grants", surveyGrantsResponse.error],
    ["farm grants", farmGrantsResponse.error],
    ["organizations", organizationsResponse.error],
    ["surveys", surveysResponse.error],
    ["farms", farmsResponse.error],
    ["audit activity", auditResponse.error],
  ];
  const failure = failures.find(([, error]) => error);
  if (failure) throw new Error(`Failed to load ${failure[0]} for this account.`, { cause: failure[1] });

  const profile = profileResponse.data as ProfileRow;
  const memberships = (membershipsResponse.data ?? []) as MembershipRow[];
  const surveyGrants = (surveyGrantsResponse.data ?? []) as SurveyGrantRow[];
  const farmGrants = (farmGrantsResponse.data ?? []) as FarmGrantRow[];
  const organizations = (organizationsResponse.data ?? []) as OrganizationOption[];
  const surveys = (surveysResponse.data ?? []) as SurveyOption[];
  const farms = (farmsResponse.data ?? []) as FarmOption[];
  const recordIds = new Set([...memberships, ...surveyGrants, ...farmGrants].map((row) => row.id));
  const auditRows = ((auditResponse.data ?? []) as AuditRow[]).filter((row) => {
    const targetId = recordId(row.record_pk);
    return targetId ? recordIds.has(targetId) : false;
  }).slice(0, 8);
  const hasLiveMembership = memberships.some((row) => ["invited", "pending", "active", "suspended"].includes(row.status));
  const previouslyGrantedSurveyIds = new Set(surveyGrants.map((grant) => grant.survey_id));
  const availableSurveys = surveys.filter((survey) => !previouslyGrantedSurveyIds.has(survey.id));
  const previouslyGrantedFarmIds = new Set(farmGrants.map((grant) => grant.farm_id));
  const availableFarms = farms.filter((farm) => !previouslyGrantedFarmIds.has(farm.id));
  const activeMembership = memberships.find((row) => row.status === "active");
  const effectiveSurveyGrants = surveyGrants.filter((row) => isEffectiveGrant(row.status, row.expires_at)).length;
  const effectiveFarmGrants = farmGrants.filter((row) => isEffectiveGrant(row.status, row.expires_at)).length;

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap gap-2">
        <Button asChild className="w-fit" size="sm" variant="outline"><Link href="/admin/users"><ArrowLeft />Users &amp; Access</Link></Button>
        <Button asChild className="w-fit" size="sm" variant="outline"><Link href={`/admin/access-preview/${profile.id}`}><Eye />Access preview</Link></Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <UserRound className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-normal">{formatName(profile)}</h1>
          <Badge variant={profile.role === "platform_admin" ? "default" : "secondary"}>{profile.role === "platform_admin" ? "Platform admin" : "User"}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{profile.email ?? profile.id}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Organization access</CardTitle></CardHeader><CardContent className="text-sm">{profile.role === "platform_admin" ? "Platform-wide" : activeMembership ? `${activeMembership.organization?.name ?? "Unknown"} - ${formatLabel(activeMembership.role)}` : "None active"}</CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Survey grants</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{effectiveSurveyGrants}</CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Farm grants</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{effectiveFarmGrants}</CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Person link</CardTitle></CardHeader><CardContent className="break-all text-sm">{profile.person_id ?? "Not linked"}</CardContent></Card>
      </section>

      {profile.role === "platform_admin" ? (
        <div className="flex gap-3 rounded-lg border bg-muted/30 p-4 text-sm"><ShieldCheck className="size-5 shrink-0" /><p>Platform administrators do not need organization memberships or resource grants. Account-role changes are not available in this workflow.</p></div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {!hasLiveMembership ? <CreateMembershipForm organizations={organizations} profileId={profile.id} /> : null}
          <CreateSurveyGrantForm profileId={profile.id} surveys={availableSurveys} />
          <CreateFarmGrantForm farms={availableFarms} profileId={profile.id} />
        </section>
      )}

      <section className="grid gap-3">
        <div><h2 className="font-semibold">Organization memberships</h2><p className="text-sm text-muted-foreground">Status and viewer/editor authority are managed independently.</p></div>
        <div className="overflow-hidden rounded-lg border bg-card">
          {memberships.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No membership history.</p> : (
            <Table><TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead><TableHead>Controls</TableHead></TableRow></TableHeader>
              <TableBody>{memberships.map((membership) => {
                const ordinaryRole = membership.role === "viewer" || membership.role === "editor";
                const nextStatuses = membershipStatusTransitions[membership.status];
                return <TableRow key={membership.id}>
                  <TableCell className="min-w-48 whitespace-normal"><div className="font-medium">{membership.organization?.name ?? "Unknown organization"}</div><div className="text-xs text-muted-foreground">{formatLabel(membership.organization?.type_code ?? null)}</div></TableCell>
                  <TableCell><Badge variant="secondary">{formatLabel(membership.role)}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{formatLabel(membership.status)}</Badge></TableCell>
                  <TableCell>{formatDate(membership.updated_at)}</TableCell>
                  <TableCell className="min-w-72 whitespace-normal">
                    {ordinaryRole && membership.status !== "removed" ? <div className="grid gap-2">
                      <form action={updateOrganizationMembershipRole} className="flex gap-2"><input name="membershipId" type="hidden" value={membership.id} /><input name="nextRole" type="hidden" value={membership.role === "viewer" ? "editor" : "viewer"} /><Button size="sm" type="submit" variant="outline">Change to {membership.role === "viewer" ? "editor" : "viewer"}</Button></form>
                      {nextStatuses.length > 0 ? <form action={updateOrganizationMembershipStatus} className="flex flex-wrap gap-2"><input name="membershipId" type="hidden" value={membership.id} /><select className="h-8 rounded-md border bg-background px-2 text-xs" name="nextStatus" required>{nextStatuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select><Button size="sm" type="submit">Update status</Button></form> : null}
                    </div> : <span className="text-xs text-muted-foreground">Protected or historical record</span>}
                  </TableCell>
                </TableRow>;
              })}</TableBody>
            </Table>
          )}
        </div>
      </section>

      <section className="grid gap-3">
        <div><h2 className="font-semibold">Survey grants</h2><p className="text-sm text-muted-foreground">Explicit survey exceptions can be revoked or reactivated without deleting history.</p></div>
        <div className="overflow-hidden rounded-lg border bg-card">
          {surveyGrants.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No survey grants.</p> : (
            <Table><TableHeader><TableRow><TableHead>Survey</TableHead><TableHead>Status</TableHead><TableHead>Expiry</TableHead><TableHead>Reason</TableHead><TableHead>Control</TableHead></TableRow></TableHeader>
              <TableBody>{surveyGrants.map((grant) => <TableRow key={grant.id}>
                <TableCell className="min-w-56 whitespace-normal">{formatSurvey(grant.survey)}</TableCell><TableCell><Badge variant={isEffectiveGrant(grant.status, grant.expires_at) ? "default" : "outline"}>{formatLabel(grant.status)}</Badge></TableCell><TableCell>{formatDate(grant.expires_at)}</TableCell><TableCell className="max-w-72 whitespace-normal">{grant.reason ?? "Not provided"}</TableCell>
                <TableCell><form action={updateSurveyAccessGrantStatus}><input name="grantId" type="hidden" value={grant.id} /><input name="nextStatus" type="hidden" value={grant.status === "active" ? "revoked" : "active"} /><Button size="sm" type="submit" variant={grant.status === "active" ? "outline" : "default"}>{grant.status === "active" ? "Revoke" : "Reactivate"}</Button></form></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          )}
        </div>
      </section>

      <section className="grid gap-3">
        <div><h2 className="font-semibold">Farm grants</h2><p className="text-sm text-muted-foreground">Explicit farm exceptions can be revoked or reactivated without deleting history.</p></div>
        <div className="overflow-hidden rounded-lg border bg-card">
          {farmGrants.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No farm grants.</p> : (
            <Table><TableHeader><TableRow><TableHead>Farm</TableHead><TableHead>Status</TableHead><TableHead>Expiry</TableHead><TableHead>Reason</TableHead><TableHead>Control</TableHead></TableRow></TableHeader><TableBody>{farmGrants.map((grant) => <TableRow key={grant.id}><TableCell>{formatFarm(grant.farm)}</TableCell><TableCell><Badge variant={isEffectiveGrant(grant.status, grant.expires_at) ? "default" : "outline"}>{formatLabel(grant.status)}</Badge></TableCell><TableCell>{formatDate(grant.expires_at)}</TableCell><TableCell className="whitespace-normal">{grant.reason ?? "Not provided"}</TableCell><TableCell><form action={updateFarmAccessGrantStatus}><input name="grantId" type="hidden" value={grant.id} /><input name="nextStatus" type="hidden" value={grant.status === "active" ? "revoked" : "active"} /><Button size="sm" type="submit" variant={grant.status === "active" ? "outline" : "default"}>{grant.status === "active" ? "Revoke" : "Reactivate"}</Button></form></TableCell></TableRow>)}</TableBody></Table>
          )}
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center gap-2"><History className="size-4 text-muted-foreground" /><div><h2 className="font-semibold">Recent related activity</h2><p className="text-sm text-muted-foreground">Compact audit summaries for this account access history.</p></div></div>
        <div className="overflow-hidden rounded-lg border bg-card">
          {auditRows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No related audit entries in the recent window.</p> : (
            <Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Record</TableHead><TableHead>Summary</TableHead></TableRow></TableHeader><TableBody>{auditRows.map((row) => <TableRow key={row.id}><TableCell>{formatDate(row.occurred_at)}</TableCell><TableCell>{row.actor?.email ?? "Unknown actor"}</TableCell><TableCell><Badge variant="outline">{formatLabel(row.action)}</Badge></TableCell><TableCell>{formatLabel(row.table_name)}</TableCell><TableCell>{changedKeys(row)}</TableCell></TableRow>)}</TableBody></Table>
          )}
        </div>
      </section>

      <div className="flex gap-2 rounded-lg border p-4 text-sm text-muted-foreground"><KeyRound className="size-4 shrink-0" /><p>Access remains enforced by membership and grant RLS. These controls do not change account roles, create Auth users, or impersonate this user.</p></div>
    </main>
  );
}