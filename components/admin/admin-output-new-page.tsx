import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createOutput } from "@/lib/actions/admin-outputs";
import { formatAdminSurveyLabel } from "@/lib/admin/survey-labels";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type SurveyOption = Pick<Tables<"surveys">, "id" | "code" | "location" | "flight_date"> & {
  client: Pick<Tables<"clients">, "code"> | null;
};

export default async function AdminOutputNewPage({ searchParams }: { searchParams: Promise<{ surveyId?: string }> }) {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin") redirect("/dashboard");

  const { surveyId } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("surveys")
    .select("id, code, location, flight_date, client:clients!surveys_client_id_fkey(code)")
    .order("flight_date", { ascending: false, nullsFirst: false });
  if (error) throw new Error("Failed to load surveys for output creation.", { cause: error });
  const surveys = (data ?? []) as SurveyOption[];
  const selectedSurveyId = surveys.some((survey) => survey.id === surveyId) ? surveyId : "";

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <Button asChild className="w-fit" size="sm" variant="outline"><Link href="/admin/outputs"><ArrowLeft />Outputs</Link></Button>
        <div className="flex items-center gap-2">
          <FilePlus2 className="size-5 text-muted-foreground" />
          <div><h1 className="text-2xl font-semibold tracking-normal">Register survey output</h1><p className="text-sm text-muted-foreground">Create a draft catalog record. Attach the existing storage prefix or object key after creation.</p></div>
        </div>
      </div>

      <Card className="max-w-3xl rounded-lg">
        <CardHeader><CardTitle className="text-base">Output details</CardTitle></CardHeader>
        <CardContent>
          <form action={createOutput} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">Survey<select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={selectedSurveyId} disabled={surveys.length === 0} name="surveyId" required><option value="">{surveys.length === 0 ? "No surveys available" : "Select survey"}</option>{surveys.map((survey) => <option key={survey.id} value={survey.id}>{formatAdminSurveyLabel(survey)}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-medium">Output type<input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={80} name="outputType" pattern="[a-z0-9_]+" placeholder="report" required /></label>
            <label className="grid gap-2 text-sm font-medium">Title<input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={200} name="title" /></label>
            <label className="grid gap-2 text-sm font-medium">Description<textarea className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm" maxLength={2000} name="description" /></label>
            <div className="flex justify-end"><Button disabled={surveys.length === 0} type="submit">Create draft output</Button></div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
