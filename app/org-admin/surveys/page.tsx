import {
  EmptyState,
  OrgAdminPage,
  OrgAdminSection,
  StatusBadge,
} from "@/components/org-admin/org-admin-ui";
import { getOrgAdminContext } from "@/lib/org-admin/context";
import { createClient } from "@/utils/supabase/server";

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
    ? await supabase.from("surveys").select("*").in("id", surveyIds).order("id")
    : { data: [], error: null };
  if (surveysResult.error) {
    throw new Error("Failed to load survey records.", { cause: surveysResult.error });
  }

  return (
    <OrgAdminPage
      title="Surveys"
      description="View confirmed organization surveys. All survey metadata is managed by platform administrators."
    >
      {!surveysResult.data?.length ? (
        <EmptyState>No confirmed organization surveys are available.</EmptyState>
      ) : (
        surveysResult.data.map((survey) => (
          <OrgAdminSection
            key={survey.id}
            title={survey.id}
            description="Read-only platform metadata"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge value={survey.status} />
                <span className="text-sm text-muted-foreground">
                  Client ID: {survey.client_id ?? "Not assigned"}
                </span>
              </div>
              <dl className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                <SurveyValue label="Location" value={survey.location} />
                <SurveyValue label="Flight date" value={survey.flight_date} />
                <SurveyValue label="Area" value={survey.area} />
                <SurveyValue label="Area code" value={survey.area_code} />
                <SurveyValue label="Type" value={survey.type} />
                <SurveyValue label="Category" value={survey.category} />
              </dl>
            </div>
          </OrgAdminSection>
        ))
      )}
    </OrgAdminPage>
  );
}

function SurveyValue({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value ?? "Not set"}</dd>
    </div>
  );
}

