import { DashboardAnalytics } from "@/components/dashboard-analytics";
import { Badge } from "@/components/ui/badge";
import type { ComputerVisionObject, Survey } from "@/lib/types";

export function UserDashboardOverview({
  surveys,
  detectedObjects,
  surveyHrefBase = "/dashboard/surveys",
}: {
  surveys: Survey[];
  detectedObjects: ComputerVisionObject[];
  surveyHrefBase?: string;
}) {
  const clients = new Map(
    surveys.map((survey) => [
      survey.client.id,
      survey.client.name || survey.client.code,
    ]),
  );
  const clientLabel = clients.size === 1
    ? [...clients.values()][0]
    : clients.size > 1
      ? `${clients.size} clients`
      : null;

  return (
    <main className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Crop intelligence</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Crop Analytics Dashboard
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Review crop findings and survey-output readiness across your accessible data.
            </p>
          </div>
          {clientLabel ? (
            <Badge variant="outline" className="w-fit px-3 py-1 text-sm">
              {clientLabel}
            </Badge>
          ) : null}
        </header>

        <DashboardAnalytics
          detectedObjects={detectedObjects}
          surveyHrefBase={surveyHrefBase}
          surveys={surveys}
        />
      </div>
    </main>
  );
}
