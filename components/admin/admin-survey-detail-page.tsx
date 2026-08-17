import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileBarChart, LinkIcon, Map, Plus } from "lucide-react";
import type { PostgrestError } from "@supabase/supabase-js";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { linkSurveyFarm, linkSurveyOrganization, updateSurvey } from "@/lib/actions/admin-surveys";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Database, Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type MissionStatus = Database["public"]["Enums"]["mission_status"];
type RelationshipType = Database["public"]["Enums"]["domain_relationship_type"];
type SurveyRow = Tables<"surveys"> & { client: Pick<Tables<"clients">, "id" | "code" | "name"> | null };
type FarmOption = Pick<Tables<"farms">, "id" | "name" | "code" | "status">;
type OrganizationOption = Pick<Tables<"organizations">, "id" | "name" | "type_code" | "status">;
type SurveyFarmRow = Pick<Tables<"survey_farms">, "farm_id" | "relationship_type" | "is_primary" | "area_covered_hectares" | "notes" | "created_at"> & { farm: FarmOption | null };
type SurveyOrganizationRow = Pick<Tables<"survey_organizations">, "organization_id" | "relationship_type" | "review_status" | "notes" | "created_at"> & { organization: OrganizationOption | null };
type OutputRow = Pick<Tables<"survey_outputs">, "id" | "title" | "output_type" | "status" | "is_current" | "storage_bucket" | "storage_path" | "updated_at">;

const statuses = ["draft", "processing", "completed", "archived"] as const satisfies readonly MissionStatus[];
const relationshipTypes = ["owner", "operator", "representative", "contact", "member", "requester", "participant", "legacy_client", "other"] as const satisfies readonly RelationshipType[];

function formatLabel(value: string | null): string {
  if (!value) return "Not set";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatArea(value: number | null): string {
  return value == null ? "Not set" : `${value.toLocaleString()} ha`;
}

function formatFarm(farm: FarmOption | null): string {
  if (!farm) return "Unknown farm";
  return farm.code ? `${farm.code} - ${farm.name}` : farm.name;
}

function TextInput({ defaultValue, label, maxLength, name, type = "text" }: { defaultValue?: string | number | null; label: string; maxLength?: number; name: string; type?: string }) {
  return <label className="grid gap-2 text-sm font-medium">{label}<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={defaultValue ?? ""} maxLength={maxLength} min={type === "number" ? "0" : undefined} name={name} step={type === "number" ? "0.0001" : undefined} type={type} /></label>;
}

function SurveyFields({ survey }: { survey: SurveyRow }) {
  return <>
    <input name="surveyId" type="hidden" value={survey.id} />
    <label className="grid gap-2 text-sm font-medium">Status<select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={survey.status} name="status" required>{statuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select></label>
    <TextInput defaultValue={survey.code} label="Code" maxLength={80} name="code" />
    <TextInput defaultValue={survey.location} label="Location" maxLength={200} name="location" />
    <TextInput defaultValue={survey.area_code} label="Area code" maxLength={80} name="areaCode" />
    <TextInput defaultValue={survey.area} label="Area" name="area" type="number" />
    <TextInput defaultValue={survey.type} label="Type" maxLength={80} name="type" />
    <TextInput defaultValue={survey.category} label="Category" maxLength={80} name="category" />
    <TextInput defaultValue={survey.access_code} label="Access code" maxLength={120} name="accessCode" />
    <label className="grid gap-2 text-sm font-medium">Flight date<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={survey.flight_date ? survey.flight_date.slice(0, 10) : ""} name="flightDate" type="date" /></label>
  </>;
}

function LinkFarmForm({ farms, survey }: { farms: FarmOption[]; survey: SurveyRow }) {
  return <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Link farm</CardTitle></CardHeader><CardContent><form action={linkSurveyFarm} className="grid gap-4 md:grid-cols-2"><input name="surveyId" type="hidden" value={survey.id} /><label className="grid gap-2 text-sm font-medium">Farm<select className="h-9 rounded-md border bg-background px-3 text-sm" disabled={farms.length === 0} name="farmId" required><option value="">{farms.length === 0 ? "No active farms" : "Select farm"}</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{formatFarm(farm)}</option>)}</select></label><label className="grid gap-2 text-sm font-medium">Relationship<select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="operator" name="relationshipType" required>{relationshipTypes.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}</select></label><TextInput label="Area covered hectares" name="areaCoveredHectares" type="number" /><label className="flex items-center gap-2 pt-7 text-sm font-medium"><input className="size-4" name="isPrimary" type="checkbox" />Primary farm</label><label className="grid gap-2 text-sm font-medium md:col-span-2">Notes<textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" maxLength={2000} name="relationshipNotes" /></label><div className="flex justify-end md:col-span-2"><Button disabled={farms.length === 0} type="submit">Link farm</Button></div></form></CardContent></Card>;
}

function LinkOrganizationForm({ organizations, survey }: { organizations: OrganizationOption[]; survey: SurveyRow }) {
  return <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Link organization</CardTitle></CardHeader><CardContent><form action={linkSurveyOrganization} className="grid gap-4 md:grid-cols-2"><input name="surveyId" type="hidden" value={survey.id} /><label className="grid gap-2 text-sm font-medium">Organization<select className="h-9 rounded-md border bg-background px-3 text-sm" disabled={organizations.length === 0} name="organizationId" required><option value="">{organizations.length === 0 ? "No active organizations" : "Select organization"}</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} ({formatLabel(organization.type_code)})</option>)}</select></label><label className="grid gap-2 text-sm font-medium">Relationship<select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="operator" name="relationshipType" required>{relationshipTypes.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}</select></label><label className="grid gap-2 text-sm font-medium md:col-span-2">Notes<textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" maxLength={2000} name="relationshipNotes" /></label><div className="flex justify-end md:col-span-2"><Button disabled={organizations.length === 0} type="submit">Link organization</Button></div></form></CardContent></Card>;
}
export default async function AdminSurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin") redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();
  const [surveyResponse, farmsResponse, organizationsResponse, surveyFarmsResponse, surveyOrganizationsResponse, outputsResponse] = await Promise.all([
    supabase.from("surveys").select("*, client:clients!surveys_client_id_fkey(id, code, name)").eq("id", id).maybeSingle(),
    supabase.from("farms").select("id, name, code, status").eq("status", "active").order("name"),
    supabase.from("organizations").select("id, name, type_code, status").eq("status", "active").order("name"),
    supabase.from("survey_farms").select("farm_id, relationship_type, is_primary, area_covered_hectares, notes, created_at, farm:farms!survey_farms_farm_id_fkey(id, name, code, status)").eq("survey_id", id).order("created_at", { ascending: false }),
    supabase.from("survey_organizations").select("organization_id, relationship_type, review_status, notes, created_at, organization:organizations!survey_organizations_organization_id_fkey(id, name, type_code, status)").eq("survey_id", id).order("created_at", { ascending: false }),
    supabase.from("survey_outputs").select("id, title, output_type, status, is_current, storage_bucket, storage_path, updated_at").eq("survey_id", id).order("updated_at", { ascending: false }),
  ]);

  if (surveyResponse.error) throw new Error("Failed to load survey.", { cause: surveyResponse.error });
  if (!surveyResponse.data) notFound();
  const failures: Array<[string, PostgrestError | null]> = [["farms", farmsResponse.error], ["organizations", organizationsResponse.error], ["survey farms", surveyFarmsResponse.error], ["survey organizations", surveyOrganizationsResponse.error], ["outputs", outputsResponse.error]];
  const failure = failures.find(([, error]) => error);
  if (failure) throw new Error(`Failed to load ${failure[0]} for this survey.`, { cause: failure[1] });

  const survey = surveyResponse.data as SurveyRow;
  const surveyFarms = (surveyFarmsResponse.data ?? []) as SurveyFarmRow[];
  const surveyOrganizations = (surveyOrganizationsResponse.data ?? []) as SurveyOrganizationRow[];
  const outputs = (outputsResponse.data ?? []) as OutputRow[];
  const linkedFarmIds = new Set(surveyFarms.map((row) => row.farm_id));
  const linkedOrganizationIds = new Set(surveyOrganizations.map((row) => row.organization_id));
  const farms = ((farmsResponse.data ?? []) as FarmOption[]).filter((farm) => !linkedFarmIds.has(farm.id));
  const organizations = ((organizationsResponse.data ?? []) as OrganizationOption[]).filter((organization) => !linkedOrganizationIds.has(organization.id));
  const readyOutputs = outputs.filter((output) => ["ready", "approved", "published"].includes(output.status)).length;

  return <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
    <div className="flex flex-col gap-4"><Button asChild className="w-fit" size="sm" variant="outline"><Link href="/admin/surveys"><ArrowLeft />Surveys</Link></Button><div className="flex flex-col gap-2"><div className="flex flex-wrap items-center gap-2"><Map className="size-5 text-muted-foreground" /><h1 className="text-2xl font-semibold tracking-normal">{survey.location ?? survey.code ?? survey.id}</h1><Badge variant="secondary">{survey.client?.code ?? "No client"}</Badge><Badge variant={survey.status === "completed" ? "default" : "outline"}>{formatLabel(survey.status)}</Badge></div><p className="max-w-3xl text-sm text-muted-foreground">Manage workshop-safe survey metadata and domain relationships. Asset paths, tile bounds, detected outputs, and destructive changes are not mutated here.</p></div></div>

    <section className="grid gap-4 md:grid-cols-4"><Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Flight date</CardTitle></CardHeader><CardContent className="text-sm">{formatDate(survey.flight_date)}</CardContent></Card><Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Area</CardTitle></CardHeader><CardContent className="text-sm">{formatArea(survey.area)}</CardContent></Card><Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Farm links</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{surveyFarms.length}</CardContent></Card><Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Ready outputs</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{readyOutputs}</CardContent></Card></section>

    <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Edit survey</CardTitle></CardHeader><CardContent><form action={updateSurvey} className="grid gap-4 lg:grid-cols-2"><SurveyFields survey={survey} /><div className="flex justify-end lg:col-span-2"><Button type="submit">Save changes</Button></div></form></CardContent></Card>

    <section className="grid gap-4 xl:grid-cols-2"><LinkFarmForm farms={farms} survey={survey} /><LinkOrganizationForm organizations={organizations} survey={survey} /></section>

    <section className="grid gap-3"><div className="flex items-center gap-2"><LinkIcon className="size-4 text-muted-foreground" /><div><h2 className="font-semibold">Farm relationships</h2><p className="text-sm text-muted-foreground">Survey access can flow through confirmed organization/farm relationships and explicit grants.</p></div></div><div className="overflow-hidden rounded-lg border bg-card">{surveyFarms.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No farm relationships.</p> : <Table><TableHeader><TableRow><TableHead>Farm</TableHead><TableHead>Relationship</TableHead><TableHead>Primary</TableHead><TableHead>Area</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader><TableBody>{surveyFarms.map((row) => <TableRow key={`${row.farm_id}-${row.relationship_type}`}><TableCell>{row.farm ? <Link className="font-medium text-primary hover:underline" href={`/admin/farms/${row.farm.id}`}>{formatFarm(row.farm)}</Link> : row.farm_id}</TableCell><TableCell><Badge variant="secondary">{formatLabel(row.relationship_type)}</Badge></TableCell><TableCell><Badge variant={row.is_primary ? "default" : "secondary"}>{row.is_primary ? "Yes" : "No"}</Badge></TableCell><TableCell>{formatArea(row.area_covered_hectares)}</TableCell><TableCell className="whitespace-normal">{row.notes ?? "Not provided"}</TableCell></TableRow>)}</TableBody></Table>}</div></section>

    <section className="grid gap-3"><div className="flex items-center gap-2"><LinkIcon className="size-4 text-muted-foreground" /><div><h2 className="font-semibold">Organization relationships</h2><p className="text-sm text-muted-foreground">Confirmed organization relationships contribute to membership-based survey access.</p></div></div><div className="overflow-hidden rounded-lg border bg-card">{surveyOrganizations.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No organization relationships.</p> : <Table><TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Relationship</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader><TableBody>{surveyOrganizations.map((row) => <TableRow key={`${row.organization_id}-${row.relationship_type}`}><TableCell>{row.organization ? <Link className="font-medium text-primary hover:underline" href={`/admin/organizations/${row.organization.id}`}>{row.organization.name}</Link> : row.organization_id}</TableCell><TableCell><Badge variant="secondary">{formatLabel(row.relationship_type)}</Badge></TableCell><TableCell><Badge variant="outline">{formatLabel(row.review_status)}</Badge></TableCell><TableCell className="whitespace-normal">{row.notes ?? "Not provided"}</TableCell></TableRow>)}</TableBody></Table>}</div></section>

    <div className="flex justify-end"><Button asChild size="sm"><Link href={`/admin/outputs/new?surveyId=${encodeURIComponent(survey.id)}`}><Plus />New output</Link></Button></div>
    <section className="grid gap-3"><div className="flex items-center gap-2"><FileBarChart className="size-4 text-muted-foreground" /><div><h2 className="font-semibold">Outputs</h2><p className="text-sm text-muted-foreground">Register outputs, manage readiness, and select the current record.</p></div></div><div className="overflow-hidden rounded-lg border bg-card">{outputs.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No survey outputs.</p> : <Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Current</TableHead><TableHead>Storage prefix</TableHead></TableRow></TableHeader><TableBody>{outputs.map((output) => <TableRow key={output.id}><TableCell><Link className="font-medium text-primary hover:underline" href={`/admin/outputs/${output.id}`}>{output.title ?? output.id.slice(0, 8)}</Link></TableCell><TableCell><Badge variant="secondary">{formatLabel(output.output_type)}</Badge></TableCell><TableCell><Badge variant="outline">{formatLabel(output.status)}</Badge></TableCell><TableCell><Badge variant={output.is_current ? "default" : "secondary"}>{output.is_current ? "Yes" : "No"}</Badge></TableCell><TableCell className="max-w-80 truncate">{output.storage_path ?? output.storage_bucket ?? "Not set"}</TableCell></TableRow>)}</TableBody></Table>}</div></section>
  </main>;
}
