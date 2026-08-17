import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileBarChart, LockKeyhole, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAdminSurveyLabel } from "@/lib/admin/survey-labels";
import { setCurrentOutput, transitionOutputStatus, updateOutput, updateOutputStorageReference } from "@/lib/actions/admin-outputs";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Database, Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type OutputStatus = Database["public"]["Enums"]["output_status"];
type SurveyOption = Pick<Tables<"surveys">, "id" | "code" | "location" | "flight_date"> & { client: Pick<Tables<"clients">, "code"> | null };
type OutputRow = Tables<"survey_outputs"> & { survey: SurveyOption | null };
type SiblingRow = Pick<Tables<"survey_outputs">, "id" | "title" | "status" | "is_current" | "updated_at">;

const nextStatuses: Partial<Record<OutputStatus, readonly OutputStatus[]>> = {
  draft: ["ready"],
  ready: ["draft", "approved"],
  approved: ["archived"],
};

function formatLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function TransitionButton({ outputId, status }: { outputId: string; status: OutputStatus }) {
  return <form action={transitionOutputStatus}><input name="outputId" type="hidden" value={outputId} /><input name="nextStatus" type="hidden" value={status} /><Button type="submit" variant={status === "approved" ? "default" : "outline"}>{status === "approved" ? <CheckCircle2 /> : <RefreshCw />}{formatLabel(status)}</Button></form>;
}

export default async function AdminOutputDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin") redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("survey_outputs")
    .select("*, survey:surveys!survey_outputs_survey_id_fkey(id, code, location, flight_date, client:clients!surveys_client_id_fkey(code))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Failed to load survey output.", { cause: error });
  if (!data) notFound();
  const output = data as OutputRow;

  const [surveysResponse, siblingsResponse] = await Promise.all([
    supabase.from("surveys").select("id, code, location, flight_date, client:clients!surveys_client_id_fkey(code)").order("flight_date", { ascending: false, nullsFirst: false }),
    supabase.from("survey_outputs").select("id, title, status, is_current, updated_at").eq("survey_id", output.survey_id).eq("output_type", output.output_type).order("updated_at", { ascending: false }),
  ]);
  if (surveysResponse.error) throw new Error("Failed to load surveys.", { cause: surveysResponse.error });
  if (siblingsResponse.error) throw new Error("Failed to load related outputs.", { cause: siblingsResponse.error });
  const surveys = (surveysResponse.data ?? []) as SurveyOption[];
  const siblings = (siblingsResponse.data ?? []) as SiblingRow[];
  const locked = output.status === "published" || output.status === "archived";
  const hasStorage = Boolean(output.storage_bucket?.trim() && output.storage_path?.trim());
  const availableTransitions = nextStatuses[output.status] ?? [];

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <Button asChild className="w-fit" size="sm" variant="outline"><Link href="/admin/outputs"><ArrowLeft />Outputs</Link></Button>
        <div className="flex flex-wrap items-center gap-2"><FileBarChart className="size-5 text-muted-foreground" /><h1 className="text-2xl font-semibold tracking-normal">{output.title ?? output.id.slice(0, 8)}</h1><Badge variant="secondary">{formatLabel(output.output_type)}</Badge><Badge variant={output.status === "approved" ? "default" : "outline"}>{formatLabel(output.status)}</Badge>{output.is_current ? <Badge>Current</Badge> : null}</div>
        <p className="max-w-3xl text-sm text-muted-foreground">Manage catalog metadata and readiness. Storage references and publication remain controlled by separate workshop workflows.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Survey</CardTitle></CardHeader><CardContent className="text-sm">{output.survey ? <Link className="font-medium text-primary hover:underline" href={`/admin/surveys/${output.survey.id}`}>{formatAdminSurveyLabel(output.survey)}</Link> : output.survey_id}</CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Storage readiness</CardTitle></CardHeader><CardContent><Badge variant={hasStorage ? "default" : "secondary"}>{hasStorage ? "Storage linked" : "Storage missing"}</Badge></CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm font-medium">Updated</CardTitle></CardHeader><CardContent className="text-sm">{formatDate(output.updated_at)}</CardContent></Card>
      </section>

      {locked ? <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4"><LockKeyhole className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-sm font-medium">This output is locked.</p><p className="text-sm text-muted-foreground">Published and archived records are retained without further mutation in this workflow.</p></div></div> : null}

      <Card className="rounded-lg">
        <CardHeader><CardTitle className="text-base">Output details</CardTitle></CardHeader>
        <CardContent>
          <form action={updateOutput} className="grid gap-4 lg:grid-cols-2">
            <input name="outputId" type="hidden" value={output.id} />
            <label className="grid gap-2 text-sm font-medium">Survey<select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={output.survey_id} disabled={locked || output.is_current} name="surveyId" required>{surveys.map((survey) => <option key={survey.id} value={survey.id}>{formatAdminSurveyLabel(survey)}</option>)}</select>{output.is_current && !locked ? <input name="surveyId" type="hidden" value={output.survey_id} /> : null}</label>
            <label className="grid gap-2 text-sm font-medium">Output type<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={output.output_type} disabled={locked || output.is_current} maxLength={80} name="outputType" pattern="[a-z0-9_]+" required />{output.is_current && !locked ? <input name="outputType" type="hidden" value={output.output_type} /> : null}</label>
            <label className="grid gap-2 text-sm font-medium lg:col-span-2">Title<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={output.title ?? ""} disabled={locked} maxLength={200} name="title" /></label>
            <label className="grid gap-2 text-sm font-medium lg:col-span-2">Description<textarea className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm" defaultValue={output.description ?? ""} disabled={locked} maxLength={2000} name="description" /></label>
            {!locked ? <div className="flex justify-end lg:col-span-2"><Button type="submit">Save changes</Button></div> : null}
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Readiness status</CardTitle></CardHeader><CardContent className="grid gap-4"><p className="text-sm text-muted-foreground">Ready and approved states require both storage references. Published status is intentionally unavailable here.</p><div className="flex flex-wrap gap-2">{availableTransitions.map((status) => <TransitionButton key={status} outputId={output.id} status={status} />)}{availableTransitions.length === 0 ? <span className="text-sm text-muted-foreground">No status actions available.</span> : null}</div></CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Current output</CardTitle></CardHeader><CardContent className="grid gap-4"><p className="text-sm text-muted-foreground">The current record is the preferred {formatLabel(output.output_type)} for this survey. Selection replaces the previous current record atomically.</p>{["ready", "approved"].includes(output.status) && !output.is_current ? <form action={setCurrentOutput}><input name="outputId" type="hidden" value={output.id} /><Button type="submit">Set as current</Button></form> : <Badge className="w-fit" variant={output.is_current ? "default" : "secondary"}>{output.is_current ? "Selected" : "Not eligible"}</Badge>}</CardContent></Card>
      </section>

      <section className="grid gap-3"><div><h2 className="font-semibold">Storage references</h2><p className="text-sm text-muted-foreground">Attach an existing object location. This workflow records metadata only; it does not upload, move, publish, or delete files.</p></div><Card className="rounded-lg"><CardContent className="pt-6">{locked ? <div className="grid gap-3 text-sm"><div><span className="font-medium">Bucket:</span> <span className="break-all text-muted-foreground">{output.storage_bucket ?? "Not set"}</span></div><div><span className="font-medium">Path:</span> <span className="break-all text-muted-foreground">{output.storage_path ?? "Not set"}</span></div></div> : <form action={updateOutputStorageReference} className="grid gap-4 lg:grid-cols-2"><input name="outputId" type="hidden" value={output.id} /><label className="grid gap-2 text-sm font-medium">Bucket<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={output.storage_bucket ?? ""} maxLength={100} name="storageBucket" pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]" placeholder="survey-outputs" required /></label><label className="grid gap-2 text-sm font-medium">Path<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={output.storage_path ?? ""} maxLength={1024} name="storagePath" placeholder="barbco-2026/orthomosaic/index.json" required /></label><div className="flex items-center justify-between gap-3 lg:col-span-2"><p className="text-sm text-muted-foreground">Storage references are required before moving an output to ready or approved.</p><Button type="submit">Save storage reference</Button></div></form>}</CardContent></Card></section>

      <section className="grid gap-3"><div><h2 className="font-semibold">Related versions</h2><p className="text-sm text-muted-foreground">Outputs with the same survey and output type.</p></div><div className="overflow-hidden rounded-lg border bg-card"><Table><TableHeader><TableRow><TableHead>Output</TableHead><TableHead>Status</TableHead><TableHead>Current</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>{siblings.map((sibling) => <TableRow key={sibling.id}><TableCell><Link className="font-medium text-primary hover:underline" href={`/admin/outputs/${sibling.id}`}>{sibling.title ?? sibling.id.slice(0, 8)}</Link></TableCell><TableCell><Badge variant="outline">{formatLabel(sibling.status)}</Badge></TableCell><TableCell><Badge variant={sibling.is_current ? "default" : "secondary"}>{sibling.is_current ? "Yes" : "No"}</Badge></TableCell><TableCell>{formatDate(sibling.updated_at)}</TableCell></TableRow>)}</TableBody></Table></div></section>
    </main>
  );
}
