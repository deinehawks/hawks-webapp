"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ComputerVisionObject, Survey } from "@/lib/types";
import {
  ArrowRightIcon,
  BoxIcon,
  CalendarDaysIcon,
  CircleAlertIcon,
  ImageIcon,
  MapPinIcon,
  PercentIcon,
  ScanSearchIcon,
  SproutIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

const HEALTHY_LABEL = "Banana Plant (Healthy-looking)";
const INFECTED_LABEL = "Banana Plant (Infected)";
const MISSION_STATUSES = ["draft", "processing", "completed", "archived"] as const;

type DetectionStats = {
  classified: number;
  healthy: number;
  infected: number;
  total: number;
};

const EMPTY_STATS: DetectionStats = {
  classified: 0,
  healthy: 0,
  infected: 0,
  total: 0,
};

function dateValue(value: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatUtcDate(value: string | null): string {
  const timestamp = dateValue(value);
  if (timestamp == null) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatArea(value: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(2)} ha`
    : "Area not available";
}

function formatStatus(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function surveyIdCompare(left: Survey, right: Survey) {
  return String(left.id).localeCompare(String(right.id), undefined, {
    numeric: true,
  });
}

function newestSurveyCompare(left: Survey, right: Survey) {
  const leftDate = dateValue(left.flight_date);
  const rightDate = dateValue(right.flight_date);
  if (leftDate == null && rightDate == null) return surveyIdCompare(left, right);
  if (leftDate == null) return 1;
  if (rightDate == null) return -1;
  if (leftDate !== rightDate) return rightDate - leftDate;
  return surveyIdCompare(left, right);
}

function percentage(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

function MetricCard({
  description,
  footer,
  icon,
  title,
  value,
}: {
  description: string;
  footer: string;
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <Card className="bg-gradient-to-t from-primary/5 to-card shadow-xs">
      <CardHeader className="gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <CardDescription>{title}</CardDescription>
        </div>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="font-medium">{footer}</p>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ProgressRow({
  label,
  total,
  value,
}: {
  label: string;
  total: number;
  value: number;
}) {
  const ratio = percentage(value, total);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {value} of {total}
        </span>
      </div>
      <div
        aria-label={`${label}: ${value} of ${total}`}
        aria-valuemax={Math.max(total, 1)}
        aria-valuemin={0}
        aria-valuenow={value}
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardAnalytics({
  detectedObjects,
  surveyHrefBase,
  surveys,
}: {
  detectedObjects: ComputerVisionObject[];
  surveyHrefBase: string;
  surveys: Survey[];
}) {
  const [requestedSurveyId, setRequestedSurveyId] = useState("");
  const surveyIds = useMemo(
    () => new Set(surveys.map((survey) => String(survey.id))),
    [surveys],
  );
  const detectionStats = useMemo(() => {
    const result = new Map<string, DetectionStats>();
    for (const survey of surveys) {
      result.set(String(survey.id), { ...EMPTY_STATS });
    }
    for (const object of detectedObjects) {
      if (!surveyIds.has(object.areaCode)) continue;
      const current = result.get(object.areaCode);
      if (!current) continue;
      current.total += 1;
      if (object.label === HEALTHY_LABEL) {
        current.healthy += 1;
        current.classified += 1;
      } else if (object.label === INFECTED_LABEL) {
        current.infected += 1;
        current.classified += 1;
      }
    }
    return result;
  }, [detectedObjects, surveyIds, surveys]);

  const detectionSurveys = useMemo(
    () =>
      [...surveys]
        .filter((survey) => {
          const stats = detectionStats.get(String(survey.id));
          return stats != null && stats.classified > 0;
        })
        .sort(newestSurveyCompare),
    [detectionStats, surveys],
  );
  const defaultSurveyId = String(detectionSurveys[0]?.id ?? "");
  const selectedSurveyId = detectionSurveys.some(
    (survey) => String(survey.id) === requestedSurveyId,
  )
    ? requestedSurveyId
    : defaultSurveyId;
  const selectedSurvey =
    detectionSurveys.find((survey) => String(survey.id) === selectedSurveyId) ??
    null;
  const selectedStats = selectedSurvey
    ? detectionStats.get(String(selectedSurvey.id)) ?? EMPTY_STATS
    : EMPTY_STATS;
  const healthyRatio = percentage(selectedStats.healthy, selectedStats.classified);
  const infectedRatio = percentage(selectedStats.infected, selectedStats.classified);

  const clientCount = useMemo(
    () => new Set(surveys.map((survey) => survey.client.id)).size,
    [surveys],
  );
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const survey of surveys) {
      counts.set(survey.status, (counts.get(survey.status) ?? 0) + 1);
    }
    return counts;
  }, [surveys]);
  const orthomosaicCount = useMemo(
    () => surveys.filter((survey) => survey.ortho != null).length,
    [surveys],
  );
  const pointCloudCount = useMemo(
    () => surveys.filter((survey) => survey.point_cloud != null).length,
    [surveys],
  );
  const detectionCoverage = useMemo(
    () =>
      surveys.filter(
        (survey) => (detectionStats.get(String(survey.id))?.total ?? 0) > 0,
      ).length,
    [detectionStats, surveys],
  );
  const attentionSurveys = useMemo(
    () =>
      [...surveys]
        .filter(
          (survey) => (detectionStats.get(String(survey.id))?.infected ?? 0) > 0,
        )
        .sort((left, right) => {
          const leftStats = detectionStats.get(String(left.id)) ?? EMPTY_STATS;
          const rightStats = detectionStats.get(String(right.id)) ?? EMPTY_STATS;
          if (leftStats.infected !== rightStats.infected) {
            return rightStats.infected - leftStats.infected;
          }
          const rateDifference =
            percentage(rightStats.infected, rightStats.classified) -
            percentage(leftStats.infected, leftStats.classified);
          if (rateDifference !== 0) return rateDifference;
          return newestSurveyCompare(left, right);
        })
        .slice(0, 5),
    [detectionStats, surveys],
  );

  return (
    <div className="space-y-6">
      <section aria-labelledby="crop-health-heading" className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="crop-health-heading" className="font-semibold">
              Crop health snapshot
            </h2>
            <p className="text-sm text-muted-foreground">
              Classified findings for one survey at a time to avoid counting repeated flights twice.
            </p>
          </div>
          <div className="w-full space-y-1.5 md:w-80">
            <Label htmlFor="dashboard-analysis-survey">Analysis survey</Label>
            {detectionSurveys.length > 0 ? (
              <Select value={selectedSurveyId} onValueChange={setRequestedSurveyId}>
                <SelectTrigger id="dashboard-analysis-survey" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {detectionSurveys.map((survey) => (
                    <SelectItem key={survey.id} value={String(survey.id)}>
                      {String(survey.id)} · {formatUtcDate(survey.flight_date)}
                      {clientCount > 1 ? ` · ${survey.client.code}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground">
                No survey with classified detections
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Flight date"
            value={formatUtcDate(selectedSurvey?.flight_date ?? null)}
            footer={selectedSurvey ? String(selectedSurvey.id) : "No survey selected"}
            description="Displayed in UTC"
            icon={<CalendarDaysIcon className="size-4" aria-hidden="true" />}
          />
          <MetricCard
            title="Classified detections"
            value={selectedStats.classified.toLocaleString()}
            footer="Healthy-looking and infected"
            description="Other detection labels are excluded"
            icon={<ScanSearchIcon className="size-4" aria-hidden="true" />}
          />
          <MetricCard
            title="Infected detections"
            value={selectedStats.infected.toLocaleString()}
            footer={
              selectedSurvey
                ? `Detected in ${String(selectedSurvey.id)}`
                : "No classified results available"
            }
            description="Detection results require field verification"
            icon={<CircleAlertIcon className="size-4" aria-hidden="true" />}
          />
          <MetricCard
            title="Infection rate"
            value={
              selectedStats.classified > 0
                ? `${(infectedRatio * 100).toFixed(1)}%`
                : "Not available"
            }
            footer={
              selectedStats.classified > 0
                ? `${selectedStats.infected.toLocaleString()} of ${selectedStats.classified.toLocaleString()} classified`
                : "No classified detections"
            }
            description="Calculated within the selected survey"
            icon={<PercentIcon className="size-4" aria-hidden="true" />}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Crop health composition</CardTitle>
            <CardDescription>
              Healthy-looking and infected classifications in the selected survey.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedSurvey ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{String(selectedSurvey.id)}</Badge>
                  <span className="flex items-center gap-1.5">
                    <MapPinIcon className="size-4" aria-hidden="true" />
                    {selectedSurvey.location || "Location not available"}
                  </span>
                  <span>{formatArea(selectedSurvey.area)}</span>
                </div>
                <div
                  aria-label={`Healthy-looking ${(healthyRatio * 100).toFixed(1)} percent; infected ${(infectedRatio * 100).toFixed(1)} percent`}
                  className="flex h-4 overflow-hidden rounded-full bg-muted"
                  role="img"
                >
                  <div
                    className="bg-emerald-500 transition-[width]"
                    style={{ width: `${healthyRatio * 100}%` }}
                  />
                  <div
                    className="bg-destructive transition-[width]"
                    style={{ width: `${infectedRatio * 100}%` }}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="size-2.5 rounded-full bg-emerald-500" />
                      Healthy-looking
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">
                      {selectedStats.healthy.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(healthyRatio * 100).toFixed(1)}% of classified detections
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="size-2.5 rounded-full bg-destructive" />
                      Infected
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">
                      {selectedStats.infected.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(infectedRatio * 100).toFixed(1)}% of classified detections
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Counts represent model detections for this survey, not unique plants across multiple flights.
                </p>
              </div>
            ) : (
              <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed p-6 text-center">
                <div className="max-w-sm">
                  <SproutIcon className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">No classified crop detections</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Health composition will appear when an accessible survey has healthy-looking or infected detections.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Survey readiness</CardTitle>
            <CardDescription>
              Mission status and current output coverage across all accessible surveys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Mission status</h3>
              {MISSION_STATUSES.map((status) => (
                <ProgressRow
                  key={status}
                  label={formatStatus(status)}
                  total={surveys.length}
                  value={statusCounts.get(status) ?? 0}
                />
              ))}
            </div>
            <div className="space-y-3 border-t pt-5">
              <h3 className="text-sm font-medium">Available outputs</h3>
              <ProgressRow
                label="Orthomosaic"
                total={surveys.length}
                value={orthomosaicCount}
              />
              <ProgressRow
                label="3D point cloud"
                total={surveys.length}
                value={pointCloudCount}
              />
              <ProgressRow
                label="Detection results"
                total={surveys.length}
                value={detectionCoverage}
              />
            </div>
            <div className="flex flex-wrap gap-2 border-t pt-5 text-sm text-muted-foreground">
              <ImageIcon className="size-4" aria-hidden="true" />
              <BoxIcon className="size-4" aria-hidden="true" />
              <span>{surveys.length} accessible {surveys.length === 1 ? "survey" : "surveys"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Surveys with infected detections</CardTitle>
          <CardDescription>
            Up to five survey results ranked by infected detection count. This is not a clinical severity score.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attentionSurveys.length > 0 ? (
            <ul className="divide-y rounded-lg border">
              {attentionSurveys.map((survey) => {
                const surveyId = String(survey.id);
                const stats = detectionStats.get(surveyId) ?? EMPTY_STATS;
                const rate = percentage(stats.infected, stats.classified);
                return (
                  <li
                    className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                    key={surveyId}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{surveyId}</p>
                        <Badge variant="outline">{formatStatus(survey.status)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatUtcDate(survey.flight_date)} · {survey.location || "Location not available"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                      <div className="text-sm">
                        <p className="font-semibold tabular-nums">
                          {stats.infected.toLocaleString()} infected
                        </p>
                        <p className="text-muted-foreground">
                          {(rate * 100).toFixed(1)}% of classified
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={surveyHrefBase + "/" + encodeURIComponent(surveyId)}>
                          View survey
                          <ArrowRightIcon aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed p-6 text-center">
              <div className="max-w-md">
                <CircleAlertIcon className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">No infected detections available</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No accessible survey currently contains an infected classification. This does not confirm that every crop was surveyed or healthy.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
