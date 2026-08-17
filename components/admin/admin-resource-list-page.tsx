import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Building2, ClipboardList, FileBarChart, Landmark, Map, Users } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
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

type ResourceName = "clients" | "surveys" | "organizations" | "people" | "farms" | "memberships" | "outputs" | "profiles";
type MembershipRole = Database["public"]["Enums"]["membership_role"] | "viewer" | "editor";

type ClientRow = Pick<Tables<"clients">, "id" | "code" | "name" | "classification_kind" | "created_at">;
type SurveyRow = Pick<Tables<"surveys">, "id" | "location" | "status" | "flight_date" | "client_id"> & {
  client: Pick<Tables<"clients">, "code" | "name"> | null;
};
type OrganizationRow = Pick<Tables<"organizations">, "id" | "name" | "code" | "type_code" | "status" | "created_at">;
type PersonRow = Pick<Tables<"people">, "id" | "display_name" | "first_name" | "last_name" | "email" | "status" | "updated_at">;
type FarmRow = Pick<Tables<"farms">, "id" | "name" | "code" | "crop" | "area_hectares" | "status">;
type MembershipRow = Omit<Pick<Tables<"organization_memberships">, "id" | "profile_id" | "organization_id" | "role" | "status" | "updated_at">, "role"> & {
  role: MembershipRole;
  profile: Pick<Tables<"profiles">, "id" | "email" | "role"> | null;
  organization: Pick<Tables<"organizations">, "id" | "name" | "type_code" | "status"> | null;
};
type OutputRow = Pick<Tables<"survey_outputs">, "id" | "title" | "output_type" | "survey_id" | "status" | "is_current">;

type DisplayRow = {
  id: string;
  cells: ReactNode[];
};

type ResourceConfig = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  headers: string[];
  rows: DisplayRow[];
  emptyLabel: string;
};

function formatLabel(value: string | null): string {
  if (!value) return "Not set";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatShortId(value: string | null): string {
  return value ? value.slice(0, 8) : "Not set";
}

function formatPersonName(person: PersonRow): string {
  return [person.first_name, person.last_name].filter(Boolean).join(" ")
    || person.display_name
    || person.email
    || formatShortId(person.id);
}

function statusBadge(value: string | boolean | null): ReactNode {
  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
  }

  return <Badge variant="secondary">{formatLabel(value)}</Badge>;
}

type AdminLinkResource = ResourceName | "users";

function detailButton(resource: ResourceName, id: string, label: string): ReactNode {
  return (
    <Button asChild size="icon" variant="ghost">
      <Link href={`/admin/${resource}/${id}`} aria-label={label}><ArrowRight /></Link>
    </Button>
  );
}

function detailLink(resource: AdminLinkResource, id: string, children: ReactNode): ReactNode {
  return <Link className="font-medium text-primary hover:underline" href={`/admin/${resource}/${id}`}>{children}</Link>;
}

function throwResourceError(resource: ResourceName, error: PostgrestError): never {
  throw new Error(`Failed to load admin ${resource}.`, { cause: error });
}

async function loadResource(resource: ResourceName): Promise<ResourceConfig> {
  const supabase = await createClient();

  if (resource === "profiles") {
    redirect("/admin/users");
  }

  switch (resource) {
    case "clients": {
      const { data, error } = await supabase.from("clients").select("id, code, name, classification_kind, created_at").order("created_at", { ascending: false }).limit(100);
      if (error) throwResourceError(resource, error);
      const rows = ((data ?? []) as ClientRow[]).map((row) => ({
        id: row.id,
        cells: [
          detailLink("clients", row.id, row.code),
          row.name ?? "Not set",
          statusBadge(row.classification_kind),
          formatDate(row.created_at),
          detailButton("clients", row.id, `Open ${row.code}`),
        ],
      }));
      return { title: "Legacy Clients", description: "Compatibility client records and classification status.", icon: Landmark, headers: ["Code", "Name", "Classification", "Created", ""], rows, emptyLabel: "No clients are visible." };
    }
    case "surveys": {
      const { data, error } = await supabase.from("surveys").select("id, location, status, flight_date, client_id, client:clients!surveys_client_id_fkey(code, name)").order("flight_date", { ascending: false, nullsFirst: false }).limit(100);
      if (error) throwResourceError(resource, error);
      const rows = ((data ?? []) as SurveyRow[]).map((row) => ({
        id: row.id,
        cells: [
          detailLink("surveys", row.id, formatShortId(row.id)),
          row.client?.code ?? formatShortId(row.client_id),
          row.location ?? "Not set",
          statusBadge(row.status),
          formatDate(row.flight_date),
          detailButton("surveys", row.id, `Open ${row.id}`),
        ],
      }));
      return { title: "Surveys", description: "Survey and mission records used by the user dashboard and protected assets.", icon: Map, headers: ["Survey", "Client", "Location", "Status", "Flight date", ""], rows, emptyLabel: "No surveys are visible." };
    }
    case "organizations": {
      const { data, error } = await supabase.from("organizations").select("id, name, code, type_code, status, created_at").order("created_at", { ascending: false }).limit(100);
      if (error) throwResourceError(resource, error);
      const rows = ((data ?? []) as OrganizationRow[]).map((row) => ({
        id: row.id,
        cells: [
          detailLink("organizations", row.id, row.name),
          statusBadge(row.type_code),
          statusBadge(row.status),
          row.code ?? "Not set",
          detailButton("organizations", row.id, `Open ${row.name}`),
        ],
      }));
      return { title: "Organizations", description: "Canonical organization records used by memberships and reviewed mappings.", icon: Building2, headers: ["Name", "Type", "Status", "Code", ""], rows, emptyLabel: "No organizations are visible." };
    }
    case "people": {
      const { data, error } = await supabase.from("people").select("id, display_name, first_name, last_name, email, status, updated_at").order("updated_at", { ascending: false }).limit(100);
      if (error) throwResourceError(resource, error);
      const rows = ((data ?? []) as PersonRow[]).map((row) => {
        const name = formatPersonName(row);
        return {
          id: row.id,
          cells: [
            detailLink("people", row.id, name),
            row.email ?? "Not set",
            statusBadge(row.status),
            formatDate(row.updated_at),
            detailButton("people", row.id, `Open ${name}`),
          ],
        };
      });
      return { title: "People", description: "Canonical farmers and contacts, separate from application accounts.", icon: Users, headers: ["Name", "Email", "Status", "Updated", ""], rows, emptyLabel: "No people records are visible." };
    }
    case "farms": {
      const { data, error } = await supabase.from("farms").select("id, name, code, crop, area_hectares, status").order("name").limit(100);
      if (error) throwResourceError(resource, error);
      const rows = ((data ?? []) as FarmRow[]).map((row) => ({
        id: row.id,
        cells: [
          detailLink("farms", row.id, row.name),
          row.code ?? "Not set",
          formatLabel(row.crop),
          row.area_hectares == null ? "Not set" : `${row.area_hectares.toLocaleString()} ha`,
          statusBadge(row.status),
          detailButton("farms", row.id, `Open ${row.name}`),
        ],
      }));
      return { title: "Farms", description: "Monitored farm and plantation-area records.", icon: ClipboardList, headers: ["Name", "Code", "Crop", "Area", "Status", ""], rows, emptyLabel: "No farm records are visible." };
    }
    case "memberships": {
      const { data, error } = await supabase.from("organization_memberships").select("id, profile_id, organization_id, role, status, updated_at, profile:profiles!organization_memberships_profile_id_fkey(id, email, role), organization:organizations!organization_memberships_organization_id_fkey(id, name, type_code, status)").order("updated_at", { ascending: false }).limit(100);
      if (error) throwResourceError(resource, error);
      const rows = ((data ?? []) as MembershipRow[]).map((row) => ({
        id: row.id,
        cells: [
          row.profile ? detailLink("users", row.profile.id, row.profile.email ?? formatShortId(row.profile.id)) : formatShortId(row.profile_id),
          row.organization?.name ?? formatShortId(row.organization_id),
          statusBadge(row.role),
          statusBadge(row.status),
          formatDate(row.updated_at),
          detailButton("memberships", row.id, "Open membership"),
        ],
      }));
      return { title: "Memberships", description: "Organization authority records. User-scoped mutation controls live on Users & Access.", icon: Users, headers: ["User", "Organization", "Role", "Status", "Updated", ""], rows, emptyLabel: "No memberships are visible." };
    }
    case "outputs": {
      const { data, error } = await supabase.from("survey_outputs").select("id, title, output_type, survey_id, status, is_current").order("updated_at", { ascending: false }).limit(100);
      if (error) throwResourceError(resource, error);
      const rows = ((data ?? []) as OutputRow[]).map((row) => ({
        id: row.id,
        cells: [
          detailLink("outputs", row.id, row.title ?? formatShortId(row.id)),
          statusBadge(row.output_type),
          detailLink("surveys", row.survey_id, formatShortId(row.survey_id)),
          statusBadge(row.status),
          statusBadge(row.is_current),
          detailButton("outputs", row.id, "Open output"),
        ],
      }));
      return { title: "Survey Outputs", description: "Published and draft survey output records.", icon: FileBarChart, headers: ["Title", "Type", "Survey", "Status", "Current", ""], rows, emptyLabel: "No survey outputs are visible." };
    }
  }
}

function isResourceName(value: string): value is ResourceName {
  return ["clients", "surveys", "organizations", "people", "farms", "memberships", "outputs", "profiles"].includes(value);
}

export default async function AdminResourceListPage({ params }: { params: Promise<{ resource: string }> }) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") redirect("/dashboard");

  const { resource } = await params;
  if (!isResourceName(resource)) notFound();

  const config = await loadResource(resource);
  const Icon = config.icon;

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-normal">{config.title}</h1>
          <Badge variant="secondary">{config.rows.length} shown</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">{config.description}</p>
      </div>

      <Card className="rounded-lg">
        <CardHeader><CardTitle className="text-base">Records</CardTitle></CardHeader>
        <CardContent>
          {config.rows.length === 0 ? (
            <p className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">{config.emptyLabel}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>{config.headers.map((header, index) => <TableHead key={`${header}-${index}`} className={header.length === 0 ? "w-12" : undefined}>{header}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {config.rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.cells.map((cell, index) => <TableCell key={`${row.id}-${index}`}>{cell}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
