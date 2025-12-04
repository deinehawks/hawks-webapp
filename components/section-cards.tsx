"use client";

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
import {
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronsDownIcon,
  ChevronsUpIcon,
  ChevronUpIcon,
  MoveRightIcon,
} from "lucide-react";
import { useMemo } from "react";

export function SectionCards({
  surveys,
  detectedObjects,
}: {
  surveys: any[];
  detectedObjects: ComputerVisionObject[];
}) {
  // --- Helper Functions ---
  const getPercentageStatus = (percentage: number) => {
    if (percentage <= 0.2) return "Very Low";
    if (percentage <= 0.4) return "Low";
    if (percentage <= 0.6) return "Average";
    if (percentage <= 0.8) return "High";
    return "Very High";
  };

  // --- Status Color Maps ---
  const healthyStatusColorMap: Record<string, string> = {
    "very low": "bg-red-100 text-red-700",
    low: "bg-orange-100 text-orange-700",
    average: "bg-yellow-100 text-yellow-700",
    high: "bg-green-100 text-green-700",
    "very high": "bg-blue-100 text-blue-700",
  };

  const unhealthyStatusColorMap: Record<string, string> = {
    "very low": "bg-green-100 text-green-700", // low unhealthy = good
    low: "bg-green-200 text-green-800",
    average: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    "very high": "bg-red-100 text-red-700", // high unhealthy = bad
  };

  // --- Surveys ---
  const numNewSurveys = useMemo(
    () =>
      surveys?.filter((s) =>
        isAfter(new Date(s.flight_date), subMonths(new Date(), 6))
      ).length ?? 0,
    [surveys]
  );

  const landMeasureNewSurveys = useMemo(
    () =>
      surveys
        ?.filter((s) =>
          isAfter(new Date(s.flight_date), subMonths(new Date(), 6))
        )
        .reduce((acc, s) => acc + s.area, 0) ?? 0,
    [surveys]
  );

  // --- Banana Objects ---
  const numHealthyBananas = useMemo(
    () =>
      detectedObjects?.filter(
        (obj) => obj.label === "Banana Plant (Healthy-looking)"
      ).length ?? 0,
    [detectedObjects]
  );

  const numUnhealthyBananas = useMemo(
    () =>
      detectedObjects?.filter((obj) => obj.label === "Banana Plant (Infected)")
        .length ?? 0,
    [detectedObjects]
  );

  const totalBananas = numHealthyBananas + numUnhealthyBananas;
  const healthyBananaPercentage = totalBananas
    ? numHealthyBananas / totalBananas
    : 0;
  const unhealthyBananaPercentage = totalBananas
    ? numUnhealthyBananas / totalBananas
    : 0;

  const healthyBananaStatus = getPercentageStatus(healthyBananaPercentage);
  const unhealthyBananaStatus = getPercentageStatus(unhealthyBananaPercentage);

  // --- Reusable Card Component ---
  const StatCard = ({
    title,
    value,
    description,
    badge,
    footerContent,
    progress,
  }: {
    title: string;
    value: string | number;
    description: string;
    badge?: React.ReactNode;
    footerContent?: React.ReactNode;
    progress?: number;
  }) => (
    <Card className="@container/card transition-transform duration-300 hover:scale-105 hover:shadow-lg">
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
          <div className="w-full bg-muted rounded-full h-2 mt-1">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
        <div className="text-muted-foreground">{description}</div>
      </CardFooter>
    </Card>
  );

  // --- Icon Mapper ---
  const PercentageCategorizationIcon = ({ status }: { status: string }) => {
    switch (status.toLowerCase()) {
      case "very low":
        return <ChevronsDownIcon className="size-4" />;
      case "low":
        return <ChevronDownIcon className="size-4" />;
      case "average":
        return <ChevronsDownIcon className="size-4" />;
      case "high":
        return <ChevronUpIcon className="size-4" />;
      case "very high":
        return <ChevronsUpIcon className="size-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 lg:px-6">
      <StatCard
        title="No. of Surveyed Areas"
        value={surveys.length}
        description="No. of surveys in the last six months"
        footerContent={
          <div className="line-clamp-1 flex gap-2 font-medium">
            <span>{numNewSurveys} new survey(s)</span>
            {numNewSurveys > 0 ? (
              <ArrowUpIcon className="size-4" />
            ) : (
              <MoveRightIcon className="size-4" />
            )}
          </div>
        }
      />

      <StatCard
        title="Total Area Surveyed"
        value={`${surveys.reduce((acc, s) => acc + s.area, 0).toFixed(2)} ha`}
        description="Land measure of new areas surveyed"
        footerContent={
          <div className="line-clamp-1 flex gap-2 font-medium">
            <span>{landMeasureNewSurveys.toFixed(1)} hectare(s) added</span>
            {numNewSurveys > 0 ? (
              <ArrowUpIcon className="size-4" />
            ) : (
              <MoveRightIcon className="size-4" />
            )}
          </div>
        }
      />

      <StatCard
        title="Crop Count: Healthy Banana"
        value={numHealthyBananas.toLocaleString()}
        description='No. of detected "healthy-looking" banana'
        badge={
          <Badge
            variant="outline"
            className={`flex gap-1 rounded-lg text-xs ${
              healthyStatusColorMap[healthyBananaStatus.toLowerCase()]
            }`}
          >
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
      />

      <StatCard
        title="Crop Count: Unhealthy Banana"
        value={numUnhealthyBananas.toLocaleString()}
        description='No. of detected "unhealthy-looking" banana'
        badge={
          <Badge
            variant="outline"
            className={`flex gap-1 rounded-lg text-xs ${
              unhealthyStatusColorMap[unhealthyBananaStatus.toLowerCase()]
            }`}
          >
            {`${(unhealthyBananaPercentage * 100).toFixed(2)}%`}
          </Badge>
        }
        footerContent={
          <div className="line-clamp-1 flex gap-2 font-medium">
            {unhealthyBananaStatus} unhealthy crop percentage
            <PercentageCategorizationIcon status={unhealthyBananaStatus} />
          </div>
        }
        progress={unhealthyBananaPercentage}
      />
    </div>
  );
}
