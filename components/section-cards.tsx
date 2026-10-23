"use client";

import { useSurveyModeStore } from "@/stores/survey-mode-store";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ComputerVisionObject } from "@/lib/types";
import { isAfter, subMonths } from "date-fns";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import {
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  Minus,
  LayoutList,
} from "lucide-react";
import { useMemo } from "react";
import { SurveyModeToggle } from "@/components/maps/shared/survey-mode-toggle";
import { countPlantDetections, type DemoCountMultipliers } from "@/lib/helpers/detection-labels";

export function SectionCards({
  surveys,
  detectedObjects,
  demoCountMultipliers,
}: {
  surveys: any[];
  detectedObjects: ComputerVisionObject[];
  demoCountMultipliers?: DemoCountMultipliers;
}) {
  const { surveyMode } = useSurveyModeStore();

  const getPercentageStatus = (percentage: number) => {
    if (percentage <= 0.2) return "Very Low";
    if (percentage <= 0.4) return "Low";
    if (percentage <= 0.6) return "Average";
    if (percentage <= 0.8) return "High";
    return "Very High";
  };

  const numNewSurveys = useMemo(
    () =>
      surveys?.filter((s) =>
        isAfter(new Date(s.flight_date), subMonths(new Date(), 6)),
      ).length ?? 0,
    [surveys],
  );

  const landMeasureNewSurveys = useMemo(
    () =>
      surveys
        ?.filter((s) =>
          isAfter(new Date(s.flight_date), subMonths(new Date(), 6)),
        )
        .reduce((acc, s) => acc + s.area, 0) ?? 0,
    [surveys],
  );

  const inventoryCounts = useMemo(() => countPlantDetections(detectedObjects, demoCountMultipliers), [detectedObjects, demoCountMultipliers]);
  const numHealthyBananas = inventoryCounts.healthy;
  const numUnhealthyBananas = inventoryCounts.unhealthy;
  const totalBananas = inventoryCounts.analysisBanana;
  const healthyBananaPercentage = totalBananas
    ? numHealthyBananas / totalBananas
    : 0;
  const unhealthyBananaPercentage = totalBananas
    ? numUnhealthyBananas / totalBananas
    : 0;

  const healthyBananaStatus = getPercentageStatus(healthyBananaPercentage);
  const unhealthyBananaStatus = getPercentageStatus(unhealthyBananaPercentage);

  const StatCard = ({
    title,
    value,
    description,
    badge,
    footerContent,
    progress,
    progressColor,
  }: {
    title: string;
    value: string | number;
    description: string;
    badge?: React.ReactNode;
    footerContent?: React.ReactNode;
    progress?: number;
    progressColor?: string;
  }) => (
    <Card
      className="@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card shadow-xs"
      data-slot="card"
    >
      <CardHeader className="relative">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
          {value}
        </CardTitle>
        {badge && <div className="absolute right-4 top-4">{badge}</div>}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-sm">
        {footerContent}
        {progress !== undefined && (
          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: progressColor ?? "hsl(var(--primary))",
              }}
            />
          </div>
        )}
        <div className="text-muted-foreground">{description}</div>
      </CardFooter>
    </Card>
  );

  const PercentageCategorizationIcon = ({ status }: { status: string }) => {
    switch (status.toLowerCase()) {
      case "very low":
        return <ChevronsDown className="size-4" />;
      case "low":
        return <ChevronDown className="size-4" />;
      case "average":
        return <Minus className="size-4" />;
      case "high":
        return <ChevronUp className="size-4" />;
      case "very high":
        return <ChevronsUp className="size-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6">
      {/* Mode toggle header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-sm font-medium">
            {surveyMode === "analysis"
              ? "Health analysis overview"
              : "Crop inventory overview"}
          </p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {surveyMode === "analysis"
              ? "Shows banana plants marked Healthy or Infected by the app. These counts may differ from Inventory."
              : inventoryCounts.coconut > 0
                ? "Counts banana and coconut plants detected in each survey."
                : "Counts banana plants detected in each survey."}
          </p>
        </div>

        <SurveyModeToggle compact />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Surveys"
          value={surveys.length}
          description="Across all available surveys"
          footerContent={
            <div className="flex items-center gap-2 font-medium">
              <span>{numNewSurveys} surveyed in the last 6 months</span>
              {numNewSurveys > 0 ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <Minus className="size-4" />
              )}
            </div>
          }
        />

        <StatCard
          title="Total surveyed area"
          value={`${surveys.reduce((acc, s) => acc + s.area, 0).toFixed(2)} ha`}
          description="Area added across all surveys"
          footerContent={
            <div className="flex items-center gap-2 font-medium">
              <span>{landMeasureNewSurveys.toFixed(1)} ha surveyed in the last 6 months</span>
              {numNewSurveys > 0 ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <Minus className="size-4" />
              )}
            </div>
          }
        />

        {surveyMode === "inventory" ? (
          <>
            {/* Slot 3 — total count */}
            <StatCard
              title={inventoryCounts.coconut ? "Total Plants" : "Total Banana Plants"}
              value={inventoryCounts.total.toLocaleString()}
              description="Plant counts added across surveys"
              badge={
                <Badge
                  variant="outline"
                  className="flex gap-1 items-center rounded-lg text-xs"
                >
                  <LayoutList className="size-3" />
                  All
                </Badge>
              }
              footerContent={
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {inventoryCounts.coconut
                    ? `Banana: ${inventoryCounts.banana.toLocaleString()} · Coconut: ${inventoryCounts.coconut.toLocaleString()}`
                    : "Detected banana plants"}
                </div>
              }
            />

            {/* Slot 4 — healthy/infected ratio in a compact split view */}
            <StatCard
              title="Surveys Processed"
              value={surveys.filter((s) => s.ortho != null).length}
              description="Surveys with aerial map data"
              footerContent={
                <div className="line-clamp-1 flex gap-2 font-medium">
                  <span>of {surveys.length} total surveys</span>
                </div>
              }
            />
          </>
        ) : (
          <>
            <StatCard
              title="Crop Count: Healthy"
              value={numHealthyBananas.toLocaleString()}
              description="Banana plants marked Healthy by the app"
              badge={
                <Badge
                  variant="outline"
                  className="flex gap-1 items-center rounded-lg text-xs"
                >
                  <IconTrendingUp className="size-3" />
                  {`${(healthyBananaPercentage * 100).toFixed(2)}%`}
                </Badge>
              }
              footerContent={
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {healthyBananaStatus} healthy crop percentage
                  <PercentageCategorizationIcon status={healthyBananaStatus} />
                </div>
              }
              progress={healthyBananaPercentage}
              progressColor="#22c55e"
            />

            <StatCard
              title="Crop Count: Infected"
              value={numUnhealthyBananas.toLocaleString()}
              description="Banana plants marked Infected by the app"
              badge={
                <Badge
                  variant="outline"
                  className="flex gap-1 items-center rounded-lg text-xs"
                >
                  <IconTrendingDown className="size-3" />
                  {`${(unhealthyBananaPercentage * 100).toFixed(2)}%`}
                </Badge>
              }
              footerContent={
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {unhealthyBananaStatus} unhealthy crop percentage
                  <PercentageCategorizationIcon
                    status={unhealthyBananaStatus}
                  />
                </div>
              }
              progress={unhealthyBananaPercentage}
              progressColor="#ef4444"
            />
          </>
        )}
      </div>
      {surveys.length > 1 && (
        <p role="note" className="text-sm leading-5 text-muted-foreground">
          Totals add up each survey's results. If surveys overlap, the same plant may be counted more than once.
        </p>
      )}
    </div>
  );
}
