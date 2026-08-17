import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
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

type ProfileRow = Pick<
  Tables<"profiles">,
  "id" | "email" | "first_name" | "last_name" | "role" | "created_at"
>;
type MembershipRole = Database["public"]["Enums"]["membership_role"];
type MembershipRow = Pick<
  Tables<"organization_memberships">,
  "profile_id" | "role" | "status"
> & {
  organization: Pick<Tables<"organizations">, "name"> | null;
};
type GrantRow = Pick<
  Tables<"survey_access_grants">,
  "profile_id" | "status" | "expires_at"
>;
type FarmGrantRow = Pick<
  Tables<"farm_access_grants">,
  "profile_id" | "status" | "expires_at"
>;

function formatName(profile: ProfileRow): string {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  return name || profile.email || profile.id;
}

function formatRole(role: ProfileRow["role"]): string {
  return role === "platform_admin" ? "Platform admin" : "User";
}

function isEffectiveGrant(grant: GrantRow | FarmGrantRow): boolean {
  return grant.status === "active"
    && (!grant.expires_at || new Date(grant.expires_at).getTime() > Date.now());
}

function groupByProfile<T extends { profile_id: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    grouped.set(row.profile_id, [...(grouped.get(row.profile_id) ?? []), row]);
  }

  return grouped;
}

function accessSummary(
  profile: ProfileRow,
  memberships: MembershipRow[],
  surveyGrants: GrantRow[],
  farmGrants: FarmGrantRow[],
): { label: string; detail: string; hasAccess: boolean } {
  if (profile.role === "platform_admin") {
    return {
      label: "Platform access",
      detail: "Full platform-admin authority",
      hasAccess: true,
    };
  }

  const activeMembership = memberships.find((row) => row.status === "active");
  const activeSurveyGrants = surveyGrants.filter(isEffectiveGrant).length;
  const activeFarmGrants = farmGrants.filter(isEffectiveGrant).length;

  if (activeMembership) {
    const grantDetail = activeSurveyGrants + activeFarmGrants > 0
      ? `; ${activeSurveyGrants} survey and ${activeFarmGrants} farm exception(s)`
      : "";
    return {
      label: "Organization access",
      detail: `${activeMembership.organization?.name ?? "Unknown organization"} as ${formatMembershipRole(activeMembership.role)}${grantDetail}`,
      hasAccess: true,
    };
  }

  if (activeSurveyGrants > 0 || activeFarmGrants > 0) {
    return {
      label: "Explicit access",
      detail: `${activeSurveyGrants} survey and ${activeFarmGrants} farm grant(s)`,
      hasAccess: true,
    };
  }

  const pendingMembership = memberships.find((row) =>
    row.status === "pending" || row.status === "invited",
  );

  if (pendingMembership) {
    return {
      label: "Pending access",
      detail: pendingMembership.organization?.name ?? "Organization approval pending",
      hasAccess: false,
    };
  }

  return {
    label: "No current access",
    detail: "No active membership or effective grant",
    hasAccess: false,
  };
}

function formatMembershipRole(role: MembershipRole): string {
  if (role === "org_admin") return "organization admin";
  if (role === "editor") return "editor";
  return "viewer";
}

export default async function AdminUsersPage() {
  const { profile: actor } = await getAuthenticatedUserContext();

  if (actor.role !== "platform_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [profilesResponse, membershipsResponse, surveyGrantsResponse, farmGrantsResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name, role, created_at")
      .order("email", { ascending: true, nullsFirst: false }),
    supabase
      .from("organization_memberships")
      .select("profile_id, role, status, organization:organizations!organization_memberships_organization_id_fkey(name)"),
    supabase
      .from("survey_access_grants")
      .select("profile_id, status, expires_at"),
    supabase
      .from("farm_access_grants")
      .select("profile_id, status, expires_at"),
  ]);

  const failures: Array<[string, PostgrestError | null]> = [
    ["profiles", profilesResponse.error],
    ["memberships", membershipsResponse.error],
    ["survey grants", surveyGrantsResponse.error],
    ["farm grants", farmGrantsResponse.error],
  ];
  const failure = failures.find(([, error]) => error);

  if (failure) {
    throw new Error(`Failed to load ${failure[0]} for Users & Access.`, {
      cause: failure[1],
    });
  }

  const profiles = (profilesResponse.data ?? []) as ProfileRow[];
  const memberships = groupByProfile((membershipsResponse.data ?? []) as MembershipRow[]);
  const surveyGrants = groupByProfile((surveyGrantsResponse.data ?? []) as GrantRow[]);
  const farmGrants = groupByProfile((farmGrantsResponse.data ?? []) as FarmGrantRow[]);
  const summaries = profiles.map((profile) => ({
    profile,
    access: accessSummary(
      profile,
      memberships.get(profile.id) ?? [],
      surveyGrants.get(profile.id) ?? [],
      farmGrants.get(profile.id) ?? [],
    ),
  }));
  const platformAdmins = profiles.filter((profile) => profile.role === "platform_admin").length;
  const usersWithAccess = summaries.filter(({ profile, access }) =>
    profile.role === "user" && access.hasAccess,
  ).length;
  const usersWithoutAccess = profiles.filter((profile) => profile.role === "user").length - usersWithAccess;

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-normal">Users &amp; Access</h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Manage existing application accounts through organization memberships and explicit resource grants. Account roles remain limited to platform admin and user.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg">
          <CardHeader><CardTitle className="text-sm font-medium">Existing accounts</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">{profiles.length}</CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader><CardTitle className="text-sm font-medium">Platform admins</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-3xl font-semibold tabular-nums"><ShieldCheck className="size-5" />{platformAdmins}</CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader><CardTitle className="text-sm font-medium">Users with access</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-3xl font-semibold tabular-nums"><UserCheck className="size-5" />{usersWithAccess}</CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader><CardTitle className="text-sm font-medium">Users without access</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-3xl font-semibold tabular-nums"><UserX className="size-5" />{usersWithoutAccess}</CardContent>
        </Card>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Existing accounts</h2>
          <p className="text-sm text-muted-foreground">Open an account to manage its memberships and grants.</p>
        </div>
        {summaries.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No profiles are visible.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Account role</TableHead>
                <TableHead>Effective access</TableHead>
                <TableHead className="w-12"><span className="sr-only">Open</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map(({ profile, access }) => (
                <TableRow key={profile.id}>
                  <TableCell className="min-w-56 whitespace-normal">
                    <div className="font-medium">{formatName(profile)}</div>
                    <div className="text-xs text-muted-foreground">{profile.email ?? profile.id}</div>
                  </TableCell>
                  <TableCell><Badge variant={profile.role === "platform_admin" ? "default" : "secondary"}>{formatRole(profile.role)}</Badge></TableCell>
                  <TableCell className="min-w-64 whitespace-normal">
                    <div className="font-medium">{access.label}</div>
                    <div className="text-xs text-muted-foreground">{access.detail}</div>
                  </TableCell>
                  <TableCell>
                    <Button asChild size="icon" variant="ghost">
                      <Link href={`/admin/users/${profile.id}`} aria-label={`Manage ${formatName(profile)}`}><ArrowRight /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}