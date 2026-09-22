import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardList, LinkIcon, Map } from "lucide-react";
import type { PostgrestError } from "@supabase/supabase-js";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmFarmOrganizationLink, updateFarm, updateFarmStatus } from "@/lib/actions/admin-farms";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Database, Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type RelationshipType = Database["public"]["Enums"]["domain_relationship_type"];
type FarmRow = Tables<"farms">;
type OrganizationOption = Pick<Tables<"organizations">, "id" | "name" | "type_code" | "status">;
type FarmOrganizationRow = Pick<Tables<"farm_organizations">, "organization_id" | "relationship_type" | "review_status" | "notes" | "created_at"> & {
  organization: Pick<Tables<"organizations">, "id" | "name" | "type_code" | "status"> | null;
};
type SurveyFarmRow = Pick<Tables<"survey_farms">, "survey_id" | "relationship_type" | "is_primary" | "area_covered_hectares" | "notes" | "created_at"> & {
  survey: (Pick<Tables<"surveys">, "id" | "location" | "flight_date" | "status" | "client_id"> & {
    client: Pick<Tables<"clients">, "code" | "name"> | null;
  }) | null;
};

const relationshipTypes = ["owner", "operator", "representative", "contact", "member", "requester", "participant", "legacy_client", "other"] as const satisfies readonly RelationshipType[];

function formatLabel(value: string | null): string {
  if (!value) return "Not set";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatArea(value: number | null): string {
  return value == null ? "Not set" : `${value.toLocaleString()} ha`;
}

function formatSurvey(survey: SurveyFarmRow["survey"]): string {
  if (!survey) return "Unknown survey";
  const client = survey.client?.code ?? survey.client?.name ?? survey.client_id ?? "Unmapped";
  return `${client} - ${survey.location ?? survey.id}`;
}

function TextInput({ defaultValue, label, maxLength, name, type = "text" }: { defaultValue?: string | number | null; label: string; maxLength?: number; name: string; type?: string }) {
  return <label className="grid gap-2 text-sm font-medium">{label}<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={defaultValue ?? ""} maxLength={maxLength} min={type === "number" ? "0" : undefined} name={name} step={type === "number" ? "0.0001" : undefined} type={type} /></label>;
}

function FarmFields({ farm }: { farm: FarmRow }) {
  return <>
    <input name="farmId" type="hidden" value={farm.id} />
    <TextInput defaultValue={farm.name} label="Name" maxLength={200} name="name" />
    <TextInput defaultValue={farm.code} label="Code" maxLength={80} name="code" />
    <TextInput defaultValue={farm.crop} label="Crop" maxLength={80} name="crop" />
    <TextInput defaultValue={farm.area_hectares} label="Area hectares" name="areaHectares" type="number" />
    <label className="grid gap-2 text-sm font-medium lg:col-span-2">Location<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={farm.location_name ?? ""} maxLength={200} name="locationName" /></label>
    <label className="grid gap-2 text-sm font-medium lg:col-span-2">Notes<textarea className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm" defaultValue={farm.notes ?? ""} maxLength={2000} name="notes" rows={4} /></label>
  </>;
}

function LinkOrganizationForm({ farm, organizations }: { farm: FarmRow; organizations: OrganizationOption[] }) {
  return <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Link organization</CardTitle></CardHeader><CardContent><form action={confirmFarmOrganizationLink} className="grid gap-4 md:grid-cols-2">
    <input name="farmId" type="hidden" value={farm.id} />
    <label className="grid gap-2 text-sm font-medium">Organization<select className="h-9 rounded-md border bg-background px-3 text-sm" disabled={organizations.length === 0 || farm.status !== "active"} name="organizationId" required><option value="">{organizations.length === 0 ? "No active organizations" : "Select organization"}</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} ({formatLabel(organization.type_code)})</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium">Relationship<select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="operator" name="relationshipType" required>{relationshipTypes.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium md:col-span-2">Notes<textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" maxLength={2000} name="relationshipNotes" /></label>
    <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Links are created as confirmed relationships. Rejection/removal workflows are deferred.</p><Button disabled={organizations.length === 0 || farm.status !== "active"} type="submit">Link organization</Button></div>
  </form></CardContent></Card>;
}

export default async function AdminFarmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin") redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();
  const [farmResponse, organizationsResponse, farmOrganizationsResponse, surveyFarmsResponse] = await Promise.all([
    supabase.from("farms").select("*").eq("id", id).maybeSingle(),
    supabase.from("organizations").select("id, name, type_code, status").eq("status", "active").order("name"),
    supabase.from("farm_organizations").select("organization_id, relationship_type, review_status, notes, created_at, organization:organizations!farm_organizations_organization_id_fkey(id, name, type_code, status)").eq("farm_id", id).order("created_at", { ascending: false }),
    supabase.from("survey_farms").select("survey_id, relationship_type, is_primary, area_covered_hectares, notes, created_at, survey:surveys!survey_farms_survey_id_fkey(id, location, flight_date, status, client_id, client:clients!surveys_client_id_fkey(code, name))").eq("farm_id", id).order("created_at", { ascending: false }),
  ]);

  if (farmResponse.error) throw new Error("Failed to load farm.", { cause: farmResponse.error });
  if (!farmResponse.data) notFound();
  const failures: Array<[string, PostgrestError | null]> = [["organizations", organizationsResponse.error], ["farm organizations", farmOrganizationsResponse.error], ["survey relationships", surveyFarmsResponse.error]];
  const failure = failures.find(([, error]) => error);
  if (failure) throw new Error(`Failed to load ${failure[0]} for this farm.`, { cause: failure[1] });

  const farm = farmResponse.data as FarmRow;
  const farmOrganizations = (farmOrganizationsResponse.data ?? []) as FarmOrganizationRow[];
  const linkedOrganizationIds = new Set(farmOrganizations.map((row) => row.organization_id));
  const organizations = ((organizationsResponse.data ?? []) as OrganizationOption[]).filter((organization) => !linkedOrganizationIds.has(organization.id));
  const surveyFarms = (surveyFarmsResponse.data ?? []) as SurveyFarmRow[];
  const nextStatus = farm.status === "active" ? "inactive" : "active";

  return <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
    <div className="flex flex-col gap-4"><Button asChild className="w-fit" size="sm" variant="outline"><Link href="/admin/farms"><ArrowLeft />Farms</Link></Button><div className="flex flex-col gap-2"><div className="flex flex-wrap items-center gap-2"><ClipboardList className="size-5 text-muted-foreground" /><h1 className="text-2xl font-semibold tracking-normal">{farm.name}</h1><Badge variant="secondary">{formatLabel(farm.crop)}</Badge><Badge variant={farm.status === "active" ? "default" : "outline"}>{formatLabel(farm.status)}</Badge></div><p className="max-w-3xl text-sm text-muted-foreground">Manage the canonical farm record and confirmed organization relationships. Survey assignment is handled in the next survey operations slice.</p></div></div>

    <section className="grid gap-4 md:grid-cols-3"><Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Code</CardTitle></CardHeader><CardContent className="text-sm">{farm.code ?? "Not set"}</CardContent></Card><Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Area</CardTitle></CardHeader><CardContent className="text-sm">{formatArea(farm.area_hectares)}</CardContent></Card><Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Survey links</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{surveyFarms.length}</CardContent></Card></section>

    <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Edit farm</CardTitle></CardHeader><CardContent><form action={updateFarm} className="grid gap-4 lg:grid-cols-2"><FarmFields farm={farm} /><div className="flex justify-end lg:col-span-2"><Button type="submit">Save changes</Button></div></form></CardContent></Card>

    <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Farm status</CardTitle></CardHeader><CardContent><form action={updateFarmStatus} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><input name="farmId" type="hidden" value={farm.id} /><input name="nextStatus" type="hidden" value={nextStatus} /><p className="text-sm text-muted-foreground">Changing status keeps history intact. It does not remove organization links, surveys, grants, or assets.</p><Button type="submit" variant={farm.status === "active" ? "outline" : "default"}>{farm.status === "active" ? "Mark inactive" : "Mark active"}</Button></form></CardContent></Card>

    <LinkOrganizationForm farm={farm} organizations={organizations} />

    <section className="grid gap-3"><div className="flex items-center gap-2"><LinkIcon className="size-4 text-muted-foreground" /><div><h2 className="font-semibold">Organization relationships</h2><p className="text-sm text-muted-foreground">Confirmed relationships contribute to membership-based farm access.</p></div></div><div className="overflow-hidden rounded-lg border bg-card">{farmOrganizations.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No organization relationships.</p> : <Table><TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Relationship</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader><TableBody>{farmOrganizations.map((row) => <TableRow key={`${row.organization_id}-${row.relationship_type}`}><TableCell>{row.organization ? <Link className="font-medium text-primary hover:underline" href={`/admin/organizations/${row.organization.id}`}>{row.organization.name}</Link> : row.organization_id}</TableCell><TableCell><Badge variant="secondary">{formatLabel(row.relationship_type)}</Badge></TableCell><TableCell><Badge variant="outline">{formatLabel(row.review_status)}</Badge></TableCell><TableCell className="whitespace-normal">{row.notes ?? "Not provided"}</TableCell></TableRow>)}</TableBody></Table>}</div></section>

    <section className="grid gap-3"><div className="flex items-center gap-2"><Map className="size-4 text-muted-foreground" /><div><h2 className="font-semibold">Survey relationships</h2><p className="text-sm text-muted-foreground">Read-only for this slice. Assignment controls are deferred to Survey Operations.</p></div></div><div className="overflow-hidden rounded-lg border bg-card">{surveyFarms.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No survey relationships.</p> : <Table><TableHeader><TableRow><TableHead>Survey</TableHead><TableHead>Relationship</TableHead><TableHead>Primary</TableHead><TableHead>Area</TableHead></TableRow></TableHeader><TableBody>{surveyFarms.map((row) => <TableRow key={`${row.survey_id}-${row.relationship_type}`}><TableCell>{row.survey ? <Link className="font-medium text-primary hover:underline" href={`/admin/surveys/${row.survey.id}`}>{formatSurvey(row.survey)}</Link> : row.survey_id}</TableCell><TableCell><Badge variant="secondary">{formatLabel(row.relationship_type)}</Badge></TableCell><TableCell><Badge variant={row.is_primary ? "default" : "secondary"}>{row.is_primary ? "Yes" : "No"}</Badge></TableCell><TableCell>{formatArea(row.area_covered_hectares)}</TableCell></TableRow>)}</TableBody></Table>}</div></section>
  </main>;
}