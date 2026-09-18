import { DashboardSurveyExplorer } from "@/components/dashboard-survey-explorer";
import { DashboardSummaryCards } from "@/components/dashboard-summary-cards";
import { Badge } from "@/components/ui/badge";
import type { ComputerVisionObject, Survey } from "@/lib/types";

export function UserDashboardOverview({
  surveys,
  detectedObjects,
  surveyHrefBase = "/dashboard/surveys",
  orthomapHrefBase = "/dashboard/orthomap",
}: {
  surveys: Survey[];
  detectedObjects: ComputerVisionObject[];
  surveyHrefBase?: string;
  orthomapHrefBase?: string;
}) {
  const client = surveys[0]?.client;

  return (
    <main className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Survey workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Survey Dashboard
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Explore the maps, outputs, and crop findings available to your account.
            </p>
          </div>
          {client ? (
            <Badge variant="outline" className="w-fit px-3 py-1 text-sm">
              {client.name || client.code}
            </Badge>
          ) : null}
        </header>

        <DashboardSummaryCards surveys={surveys} detectedObjects={detectedObjects} />
        <DashboardSurveyExplorer
          detectedObjects={detectedObjects}
          orthomapHrefBase={orthomapHrefBase}
          surveyHrefBase={surveyHrefBase}
          surveys={surveys}
        />
      </div>
    </main>
  );
}
