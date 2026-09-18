"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ComputerVisionObject, Survey } from "@/lib/types";
import { useSurveyModeStore } from "@/stores/survey-mode-store";
import {
  BoxIcon,
  CalendarDaysIcon,
  ImageIcon,
  LayoutListIcon,
  SproutIcon,
  StethoscopeIcon,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

function validDateValue(value: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatUtcDate(value: string | null): string {
  const timestamp = validDateValue(value);
  if (timestamp == null) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function StatCard({
  badge,
  description,
  footer,
  icon,
  progress,
  progressClassName,
  title,
  value,
}: {
  badge?: ReactNode;
  description: string;
  footer: string;
  icon: ReactNode;
  progress?: number;
  progressClassName?: string;
  title: string;
  value: string | number;
}) {
  return (
    <Card className="bg-gradient-to-t from-primary/5 to-card shadow-xs">
      <CardHeader className="relative gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <CardDescription>{title}</CardDescription>
        </div>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {badge ? <div className="absolute right-4 top-4">{badge}</div> : null}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-sm">
        <p className="font-medium">{footer}</p>
        {progress != null ? (
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className={cn("h-full rounded-full bg-primary", progressClassName)}
              style={{ width: Math.min(Math.max(progress * 100, 0), 100) + "%" }}
            />
          </div>
        ) : null}
        <p className="text-muted-foreground">{description}</p>
      </CardFooter>
    </Card>
  );
}

export function DashboardSummaryCards({
  surveys,
  detectedObjects,
}: {
  surveys: Survey[];
  detectedObjects: ComputerVisionObject[];
}) {
  const { surveyMode, setSurveyMode } = useSurveyModeStore();

  const latestSurvey = useMemo(
    () =>
      surveys.reduce<Survey | null>((latest, survey) => {
        const surveyDate = validDateValue(survey.flight_date);
        if (surveyDate == null) return latest;
        const latestDate = latest ? validDateValue(latest.flight_date) : null;
        return latestDate == null || surveyDate > latestDate ? survey : latest;
      }, null),
    [surveys],
  );

  const orthomosaicCount = useMemo(
    () => surveys.filter((survey) => survey.ortho != null).length,
    [surveys],
  );
  const pointCloudCount = useMemo(
    () => surveys.filter((survey) => survey.point_cloud != null).length,
    [surveys],
  );
  const healthyCount = useMemo(
    () =>
      detectedObjects.filter(
        (object) => object.label === "Banana Plant (Healthy-looking)",
      ).length,
    [detectedObjects],
  );
  const infectedCount = useMemo(
    () =>
      detectedObjects.filter(
        (object) => object.label === "Banana Plant (Infected)",
      ).length,
    [detectedObjects],
  );

  const classifiedCount = healthyCount + infectedCount;
  const healthyRatio = classifiedCount > 0 ? healthyCount / classifiedCount : 0;
  const infectedRatio = classifiedCount > 0 ? infectedCount / classifiedCount : 0;
  const surveyTotal = Math.max(surveys.length, 1);

  return (
    <section aria-labelledby="dashboard-summary-heading" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="dashboard-summary-heading" className="font-semibold">
            Account summary
          </h2>
          <p className="text-sm text-muted-foreground">
            {surveyMode === "analysis"
              ? "Crop findings across the surveys currently available."
              : "Survey and output readiness for this account."}
          </p>
        </div>

        <div
          className="flex w-fit items-center gap-1 rounded-lg border bg-muted p-1"
          role="group"
          aria-label="Dashboard summary mode"
        >
          <button
            type="button"
            aria-pressed={surveyMode === "analysis"}
            onClick={() => setSurveyMode("analysis")}
            className={cn(
              "flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              surveyMode === "analysis"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <StethoscopeIcon className="size-4" aria-hidden="true" />
            Analysis
          </button>
          <button
            type="button"
            aria-pressed={surveyMode === "inventory"}
            onClick={() => setSurveyMode("inventory")}
            className={cn(
              "flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              surveyMode === "inventory"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutListIcon className="size-4" aria-hidden="true" />
            Inventory
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Accessible surveys"
          value={surveys.length}
          footer={surveys.length === 1 ? "1 survey available" : surveys.length + " surveys available"}
          description="Limited to this account's authorized scope"
          icon={<LayoutListIcon className="size-4" aria-hidden="true" />}
        />
        <StatCard
          title="Latest flight"
          value={formatUtcDate(latestSurvey?.flight_date ?? null)}
          footer={latestSurvey ? String(latestSurvey.id) : "No dated survey"}
          description="Dates are displayed in UTC"
          icon={<CalendarDaysIcon className="size-4" aria-hidden="true" />}
        />

        {surveyMode === "inventory" ? (
          <>
            <StatCard
              title="Orthomosaics available"
              value={orthomosaicCount}
              footer={orthomosaicCount + " of " + surveys.length + " surveys"}
              description="Current aerial map outputs"
              icon={<ImageIcon className="size-4" aria-hidden="true" />}
              progress={orthomosaicCount / surveyTotal}
            />
            <StatCard
              title="Point clouds available"
              value={pointCloudCount}
              footer={pointCloudCount + " of " + surveys.length + " surveys"}
              description="Current 3D data outputs"
              icon={<BoxIcon className="size-4" aria-hidden="true" />}
              progress={pointCloudCount / surveyTotal}
            />
          </>
        ) : (
          <>
            <StatCard
              title="Healthy-looking plants"
              value={healthyCount.toLocaleString()}
              footer={(healthyRatio * 100).toFixed(1) + "% of classified detections"}
              description="Based on available detection results"
              icon={<SproutIcon className="size-4" aria-hidden="true" />}
              badge={<Badge variant="outline">Healthy</Badge>}
              progress={healthyRatio}
              progressClassName="bg-emerald-500"
            />
            <StatCard
              title="Infected plants"
              value={infectedCount.toLocaleString()}
              footer={(infectedRatio * 100).toFixed(1) + "% of classified detections"}
              description="Based on available detection results"
              icon={<StethoscopeIcon className="size-4" aria-hidden="true" />}
              badge={<Badge variant="outline">Attention</Badge>}
              progress={infectedRatio}
              progressClassName="bg-destructive"
            />
          </>
        )}
      </div>
    </section>
  );
}
