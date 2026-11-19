import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye, ShieldCheck } from "lucide-react";
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
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Database, Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type GrantStatus = Database["public"]["Enums"]["access_grant_status"];
type ProfileRow = Pick<
  Tables<"profiles">,
  "id" | "email" | "first_name" | "last_name" | "role"
>;
type MembershipRow = Pick<
  Tables<"organization_memberships">,
  "organization_id" | "role" | "status"
> & {
  organization: Pick<Tables<"organizations">, "id" | "name" | "type_code" | "status"> | null;
};
type SurveyGrantRow = Pick<
  Tables<"survey_access_grants">,
  "survey_id" | "status" | "expires_at" | "reason"
> & {
  survey: (Pick<Tables<"surveys">, "id" | "location" | "flight_date" | "client_id"> & {
    client: Pick<Tables<"clients">, "code" | "name"> | null;
  }) | null;
};
type FarmGrantRow = Pick<
  Tables<"farm_access_grants">,
  "farm_id" | "status" | "expires_at" | "reason"
> & {
  farm: Pick<Tables<"farms">, "id" | "name" | "code" | "status"> | null;
};
type SurveyOrganizationRow = Pick<Tables<"survey_organizations">, "survey_id" | "organization_id" | "review_status"> & {
  survey: (Pick<Tables<"surveys">, "id" | "location" | "flight_date" | "client_id"> & {
    client: Pick<Tables<"clients">, "code" | "name"> | null;
  }) | null;
};
type FarmOrganizationRow = Pick<Tables<"farm_organizations">, "farm_id" | "organization_id" | "review_status"> & {
  farm: Pick<Tables<"farms">, "id" | "name" | "code" | "status"> | null;
};

type AccessItem = {
  id: string;
  label: string;
  source: string;
  status: "effective" | "inactive";
  detail: string;
};

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
  if (!value) return "No expiry";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function isEffectiveGrant(status: GrantStatus, expiresAt: string | null): boolean {
  return status === "active" && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
}

function formatSurvey(survey: SurveyGrantRow["survey"] | SurveyOrganizationRow["survey"]): string {
  if (!survey) return "Unknown survey";
  const client = survey.client?.code ?? survey.client?.name ?? survey.client_id ?? "Unmapped";
  return `${client} - ${survey.location ?? survey.id}`;
}

function formatFarm(farm: FarmGrantRow["farm"] | FarmOrganizationRow["farm"]): string {
  if (!farm) return "Unknown farm";
  return farm.code ? `${farm.code} - ${farm.name}` : farm.name;
}

export default async function AdminAccessPreviewPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profile: actor } = await getAuthenticatedUserContext();

  if (actor.role !== "platform_admin") redirect("/dashboard");

  const { profileId } = await params;
  const supabase = await createClient();
  const [profileResponse, membershipsResponse, surveyGrantsResponse, farmGrantsResponse] = await Promise.all([
    supabase.from("profiles").select("id, email, first_name, last_name, role").eq("id", profileId).maybeSingle(),
    supabase.from("organization_memberships").select("organization_id, role, status, organization:organizations!organization_memberships_organization_id_fkey(id, name, type_code, status)").eq("profile_id", profileId),
    supabase.from("survey_access_grants").select("survey_id, status, expires_at, reason, survey:surveys!survey_access_grants_survey_id_fkey(id, location, flight_date, client_id, client:clients!surveys_client_id_fkey(code, name))").eq("profile_id", profileId),
    supabase.from("farm_access_grants").select("farm_id, status, expires_at, reason, farm:farms!farm_access_grants_farm_id_fkey(id, name, code, status)").eq("profile_id", profileId),
  ]);

  if (profileResponse.error) throw new Error("Failed to load access-preview account.", { cause: profileResponse.error });
  if (!profileResponse.data) notFound();

  const failures: Array<[string, PostgrestError | null]> = [
    ["memberships", membershipsResponse.error],
    ["survey grants", surveyGrantsResponse.error],
    ["farm grants", farmGrantsResponse.error],
  ];
  const failure = failures.find(([, error]) => error);
  if (failure) throw new Error(`Failed to load ${failure[0]} for access preview.`, { cause: failure[1] });

  const profile = profileResponse.data as ProfileRow;
  const memberships = (membershipsResponse.data ?? []) as MembershipRow[];
  const surveyGrants = (surveyGrantsResponse.data ?? []) as SurveyGrantRow[];
  const farmGrants = (farmGrantsResponse.data ?? []) as FarmGrantRow[];
  const activeOrganizationIds = memberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.organization_id);
  const managedOrganizationIds = memberships
    .filter((membership) => membership.status === "active" && membership.role === "org_admin")
    .map((membership) => membership.organization_id);

  const [surveyOrganizationsResponse, farmOrganizationsResponse] = managedOrganizationIds.length > 0
    ? await Promise.all([
      supabase.from("survey_organizations").select("survey_id, organization_id, review_status, survey:surveys!survey_organizations_survey_id_fkey(id, location, flight_date, client_id, client:clients!surveys_client_id_fkey(code, name))").in("organization_id", managedOrganizationIds).eq("review_status", "confirmed"),
      supabase.from("farm_organizations").select("farm_id, organization_id, review_status, farm:farms!farm_organizations_farm_id_fkey(id, name, code, status)").in("organization_id", managedOrganizationIds).eq("review_status", "confirmed"),
    ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (surveyOrganizationsResponse.error) {
    throw new Error("Failed to load organization survey access.", { cause: surveyOrganizationsResponse.error });
  }
  if (farmOrganizationsResponse.error) {
    throw new Error("Failed to load organization farm access.", { cause: farmOrganizationsResponse.error });
  }

  const surveyItems = new Map<string, AccessItem>();
  const farmItems = new Map<string, AccessItem>();

  for (const row of (surveyOrganizationsResponse.data ?? []) as SurveyOrganizationRow[]) {
    if (!row.survey) continue;
    surveyItems.set(row.survey_id, {
      id: row.survey_id,
      label: formatSurvey(row.survey),
      source: "Organization-admin management",
      status: "effective",
      detail: `Organization ${row.organization_id}`,
    });
  }

  for (const grant of surveyGrants) {
    const effective = isEffectiveGrant(grant.status, grant.expires_at);
    if (effective || !surveyItems.has(grant.survey_id)) {
      surveyItems.set(grant.survey_id, {
        id: grant.survey_id,
        label: formatSurvey(grant.survey),
        source: "Survey grant",
        status: effective ? "effective" : "inactive",
        detail: `${formatLabel(grant.status)}; ${formatDate(grant.expires_at)}`,
      });
    }
  }

  for (const row of (farmOrganizationsResponse.data ?? []) as FarmOrganizationRow[]) {
    if (!row.farm) continue;
    farmItems.set(row.farm_id, {
      id: row.farm_id,
      label: formatFarm(row.farm),
      source: "Organization-admin management",
      status: "effective",
      detail: `Organization ${row.organization_id}`,
    });
  }

  for (const grant of farmGrants) {
    const effective = isEffectiveGrant(grant.status, grant.expires_at);
    if (effective || !farmItems.has(grant.farm_id)) {
      farmItems.set(grant.farm_id, {
        id: grant.farm_id,
        label: formatFarm(grant.farm),
        source: "Farm grant",
        status: effective ? "effective" : "inactive",
        detail: `${formatLabel(grant.status)}; ${formatDate(grant.expires_at)}`,
      });
    }
  }

  const effectiveSurveys = [...surveyItems.values()].filter((item) => item.status === "effective");
  const effectiveFarms = [...farmItems.values()].filter((item) => item.status === "effective");

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap gap-2">
        <Button asChild className="w-fit" size="sm" variant="outline">
          <Link href={`/admin/users/${profile.id}`}><ArrowLeft />User detail</Link>
        </Button>
        {profile.role === "user" ? (
          <Button asChild className="w-fit" size="sm">
            <Link href={`/user-app-preview/${profile.id}`}><Eye />User app preview</Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Eye className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-normal">Access preview</h1>
          <Badge variant={profile.role === "platform_admin" ? "default" : "secondary"}>{profile.role === "platform_admin" ? "Platform admin" : "User"}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{formatName(profile)} - {profile.email ?? profile.id}</p>
      </div>

      <div className="flex gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
        <ShieldCheck className="size-5 shrink-0" />
        <p>This is a read-only calculation from memberships and grants. It does not switch sessions, impersonate the user, or bypass RLS.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Active memberships</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{activeOrganizationIds.length}</CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Visible surveys</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{profile.role === "platform_admin" ? "All" : effectiveSurveys.length}</CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Visible farms</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{profile.role === "platform_admin" ? "All" : effectiveFarms.length}</CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Grant exceptions</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{surveyGrants.filter((grant) => isEffectiveGrant(grant.status, grant.expires_at)).length + farmGrants.filter((grant) => isEffectiveGrant(grant.status, grant.expires_at)).length}</CardContent></Card>
      </section>

      {profile.role === "platform_admin" ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">Platform administrators have platform-wide access. Resource lists are not expanded here to keep the preview focused on user-scoped access paths.</p>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          <AccessTable emptyText="No effective survey access." items={effectiveSurveys} title="Effective surveys" />
          <AccessTable emptyText="No effective farm access." items={effectiveFarms} title="Effective farms" />
        </section>
      )}
    </main>
  );
}

function AccessTable({ emptyText, items, title }: { emptyText: string; items: AccessItem[]; title: string }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3"><h2 className="font-semibold">{title}</h2></div>
      {items.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{emptyText}</p> : (
        <Table>
          <TableHeader><TableRow><TableHead>Resource</TableHead><TableHead>Source</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
          <TableBody>{items.map((item) => <TableRow key={item.id}><TableCell className="min-w-56 whitespace-normal">{item.label}</TableCell><TableCell>{item.source}</TableCell><TableCell className="whitespace-normal">{item.detail}</TableCell></TableRow>)}</TableBody>
        </Table>
      )}
    </section>
  );
}
