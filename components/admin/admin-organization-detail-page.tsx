import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, Users } from "lucide-react";
import type { PostgrestError } from "@supabase/supabase-js";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createOrganizationMembership } from "@/lib/actions/admin-memberships";
import { updateOrganization, updateOrganizationStatus } from "@/lib/actions/admin-organizations";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Database, Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type MembershipStatus = Database["public"]["Enums"]["membership_status"];
type OrganizationRow = Tables<"organizations">;
type OrganizationTypeOption = Pick<Tables<"organization_types">, "code" | "label">;
type UserOption = Pick<Tables<"profiles">, "id" | "email" | "first_name" | "last_name" | "role">;
type MembershipRow = Pick<Tables<"organization_memberships">, "id" | "profile_id" | "role" | "status" | "updated_at"> & {
  profile: Pick<Tables<"profiles">, "id" | "email" | "first_name" | "last_name" | "role"> | null;
};

const liveStatuses = new Set<MembershipStatus>(["invited", "pending", "active", "suspended"]);

function formatLabel(value: string | null): string {
  if (!value) return "Not set";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatName(profile: UserOption): string {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || profile.id;
}

function TextInput({ defaultValue, label, maxLength, name, type = "text" }: { defaultValue?: string | null; label: string; maxLength: number; name: string; type?: string }) {
  return <label className="grid gap-2 text-sm font-medium">{label}<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={defaultValue ?? ""} maxLength={maxLength} name={name} type={type} /></label>;
}

function OrganizationFields({ organization, types }: { organization: OrganizationRow; types: OrganizationTypeOption[] }) {
  return <>
    <input name="organizationId" type="hidden" value={organization.id} />
    <label className="grid gap-2 text-sm font-medium">Name<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={organization.name} maxLength={200} name="name" required /></label>
    <label className="grid gap-2 text-sm font-medium">Type<select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={organization.type_code} disabled={types.length === 0} name="typeCode" required>{types.map((type) => <option key={type.code} value={type.code}>{type.label}</option>)}</select></label>
    <TextInput defaultValue={organization.code} label="Code" maxLength={80} name="code" />
    <TextInput defaultValue={organization.email} label="Email" maxLength={320} name="email" type="email" />
    <TextInput defaultValue={organization.mobile} label="Mobile" maxLength={80} name="mobile" />
    <TextInput defaultValue={organization.telephone} label="Telephone" maxLength={80} name="telephone" />
    <TextInput defaultValue={organization.street} label="Street" maxLength={200} name="street" />
    <TextInput defaultValue={organization.village} label="Village" maxLength={120} name="village" />
    <TextInput defaultValue={organization.barangay} label="Barangay" maxLength={120} name="barangay" />
    <TextInput defaultValue={organization.city} label="City" maxLength={120} name="city" />
    <TextInput defaultValue={organization.province} label="Province" maxLength={120} name="province" />
    <TextInput defaultValue={organization.region} label="Region" maxLength={120} name="region" />
    <TextInput defaultValue={organization.country} label="Country" maxLength={120} name="country" />
    <TextInput defaultValue={organization.zip_code} label="ZIP code" maxLength={40} name="zipCode" />
    <label className="grid gap-2 text-sm font-medium lg:col-span-2">Notes<textarea className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm" defaultValue={organization.notes ?? ""} maxLength={2000} name="notes" rows={4} /></label>
  </>;
}

function AddMembershipForm({ organization, users }: { organization: OrganizationRow; users: UserOption[] }) {
  return <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Add existing user</CardTitle></CardHeader><CardContent><form action={createOrganizationMembership} className="grid gap-4 md:grid-cols-2">
    <input name="organizationId" type="hidden" value={organization.id} />
    <label className="grid gap-2 text-sm font-medium md:col-span-2">User account<select className="h-9 rounded-md border bg-background px-3 text-sm" disabled={users.length === 0} name="profileId" required><option value="">{users.length === 0 ? "No eligible users" : "Select user"}</option>{users.map((user) => <option key={user.id} value={user.id}>{formatName(user)}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium">Role<select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="member" name="role" required><option value="member">Member</option><option value="org_admin">Organization admin</option></select></label>
    <label className="grid gap-2 text-sm font-medium">Initial status<select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="pending" name="status" required><option value="pending">Pending</option><option value="active">Active</option></select></label>
    <label className="grid gap-2 text-sm font-medium md:col-span-2">Notes<textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" maxLength={2000} name="membershipNotes" /></label>
    <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Members require explicit resource grants. Platform admins may appoint organization admins.</p><Button disabled={users.length === 0 || organization.status !== "active"} type="submit">Add membership</Button></div>
  </form></CardContent></Card>;
}

export default async function AdminOrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin") redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();
  const [organizationResponse, typesResponse, membershipsResponse, usersResponse] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", id).maybeSingle(),
    supabase.from("organization_types").select("code, label").eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("organization_memberships").select("id, profile_id, role, status, updated_at, profile:profiles!organization_memberships_profile_id_fkey(id, email, first_name, last_name, role)").eq("organization_id", id).order("updated_at", { ascending: false }),
    supabase.from("profiles").select("id, email, first_name, last_name, role").eq("role", "user").order("email", { ascending: true, nullsFirst: false }).limit(200),
  ]);

  if (organizationResponse.error) throw new Error("Failed to load organization.", { cause: organizationResponse.error });
  if (!organizationResponse.data) notFound();

  const failures: Array<[string, PostgrestError | null]> = [
    ["organization types", typesResponse.error],
    ["memberships", membershipsResponse.error],
    ["users", usersResponse.error],
  ];
  const failure = failures.find(([, error]) => error);
  if (failure) throw new Error(`Failed to load ${failure[0]} for this organization.`, { cause: failure[1] });

  const organization = organizationResponse.data as OrganizationRow;
  const types = (typesResponse.data ?? []) as OrganizationTypeOption[];
  const memberships = (membershipsResponse.data ?? []) as MembershipRow[];
  const users = (usersResponse.data ?? []) as UserOption[];
  const liveMemberIds = new Set(memberships.filter((membership) => liveStatuses.has(membership.status)).map((membership) => membership.profile_id));
  const eligibleUsers = users.filter((user) => !liveMemberIds.has(user.id));
  const nextStatus = organization.status === "active" ? "inactive" : "active";

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <Button asChild className="w-fit" size="sm" variant="outline"><Link href="/admin/organizations"><ArrowLeft />Organizations</Link></Button>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-normal">{organization.name}</h1>
            <Badge variant="secondary">{formatLabel(organization.type_code)}</Badge>
            <Badge variant={organization.status === "active" ? "default" : "outline"}>{formatLabel(organization.status)}</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">Manage the canonical organization record used by memberships and reviewed domain relationships. Destructive deletion and organization-admin promotion are deferred.</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Code</CardTitle></CardHeader><CardContent className="text-sm">{organization.code ?? "Not set"}</CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Active members</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{memberships.filter((membership) => membership.status === "active").length}</CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Updated</CardTitle></CardHeader><CardContent className="text-sm">{formatDate(organization.updated_at)}</CardContent></Card>
      </section>

      <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Edit organization</CardTitle></CardHeader><CardContent><form action={updateOrganization} className="grid gap-4 lg:grid-cols-2"><OrganizationFields organization={organization} types={types} /><div className="flex justify-end lg:col-span-2"><Button disabled={types.length === 0} type="submit">Save changes</Button></div></form></CardContent></Card>

      <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Organization status</CardTitle></CardHeader><CardContent><form action={updateOrganizationStatus} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><input name="organizationId" type="hidden" value={organization.id} /><input name="nextStatus" type="hidden" value={nextStatus} /><p className="text-sm text-muted-foreground">Changing status keeps history intact. It does not remove memberships, users, farms, surveys, or grants.</p><Button type="submit" variant={organization.status === "active" ? "outline" : "default"}>{organization.status === "active" ? "Mark inactive" : "Mark active"}</Button></form></CardContent></Card>

      <AddMembershipForm organization={organization} users={eligibleUsers} />

      <section className="grid gap-3">
        <div className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" /><div><h2 className="font-semibold">Membership roster</h2><p className="text-sm text-muted-foreground">Organization authority comes from active memberships. Manage status and role from the user detail page.</p></div></div>
        <div className="overflow-hidden rounded-lg border bg-card">
          {memberships.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No membership history for this organization.</p> : (
            <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{memberships.map((membership) => <TableRow key={membership.id}><TableCell className="min-w-56 whitespace-normal"><div className="font-medium">{membership.profile ? formatName(membership.profile) : membership.profile_id}</div><div className="text-xs text-muted-foreground">{membership.profile?.email ?? "Missing profile"}</div></TableCell><TableCell><Badge variant="secondary">{formatLabel(membership.role)}</Badge></TableCell><TableCell><Badge variant="outline">{formatLabel(membership.status)}</Badge></TableCell><TableCell>{formatDate(membership.updated_at)}</TableCell><TableCell><Button asChild size="sm" variant="outline"><Link href={`/admin/users/${membership.profile_id}`}>Manage user</Link></Button></TableCell></TableRow>)}</TableBody></Table>
          )}
        </div>
      </section>
    </main>
  );
}
