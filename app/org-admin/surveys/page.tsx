import Link from "next/link";

import {
  EmptyState,
  OrgAdminPage,
  OrgAdminSection,
  StatusBadge,
} from "@/components/org-admin/org-admin-ui";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Tables } from "@/lib/database.types";
import { getOrgAdminContext } from "@/lib/org-admin/context";
import { createClient } from "@/utils/supabase/server";

type SurveyListRow = Pick<
  Tables<"surveys">,
  "id" | "location" | "flight_date" | "area" | "type" | "category" | "status"
>;

function displayValue(value: string | null) {
  return value || "Not set";
}

function formatArea(value: number | null) {
  return value === null ? "Not set" : `${value} ha`;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export default async function OrgAdminSurveysPage() {
  const { organization } = await getOrgAdminContext();
  const supabase = await createClient();
  const { data: links, error: linkError } = await supabase
    .from("survey_organizations")
    .select("survey_id")
    .eq("organization_id", organization.id)
    .eq("review_status", "confirmed");
  if (linkError) throw new Error("Failed to load confirmed surveys.", { cause: linkError });

  const surveyIds = (links ?? []).map((link) => link.survey_id);
  const surveysResult = surveyIds.length
    ? await supabase
        .from("surveys")
        .select("id, location, flight_date, area, type, category, status")
        .in("id", surveyIds)
        .order("id")
    : { data: [], error: null };
  if (surveysResult.error) {
    throw new Error("Failed to load survey records.", { cause: surveysResult.error });
  }

  const surveys = (surveysResult.data ?? []) as SurveyListRow[];

  return (
    <OrgAdminPage
      title="Surveys"
      description="View confirmed organization surveys. All survey metadata is managed by platform administrators."
    >
      <OrgAdminSection
        title="Confirmed surveys"
        description="View survey data through the existing authenticated and RLS-protected route."
      >
        {surveys.length === 0 ? (
          <EmptyState>No confirmed organization surveys are available.</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Survey ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Flight date</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map((survey) => (
                  <TableRow key={survey.id}>
                    <TableCell className="font-medium">{survey.id}</TableCell>
                    <TableCell className="min-w-48 whitespace-normal">
                      {displayValue(survey.location)}
                    </TableCell>
                    <TableCell>{formatDate(survey.flight_date)}</TableCell>
                    <TableCell>{formatArea(survey.area)}</TableCell>
                    <TableCell>{displayValue(survey.type)}</TableCell>
                    <TableCell>{displayValue(survey.category)}</TableCell>
                    <TableCell>
                      <StatusBadge value={survey.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/surveys/${encodeURIComponent(survey.id)}`}>
                          View Data
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </OrgAdminSection>
    </OrgAdminPage>
  );
}
