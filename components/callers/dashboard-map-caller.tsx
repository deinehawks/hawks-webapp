"use client";

import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

type DashboardSurvey = {
  id: string | number;
  geojson_boundaries: unknown;
  boundaries: unknown;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
};

type DashboardMapCallerProps = {
  data: DashboardSurvey[];
  onSurveySelect?: (surveyId: string) => void;
  selectedSurveyId?: string | null;
  surveyHrefBase?: string;
};

const DashboardMap = dynamic(() => import("@/components/maps/dashboard-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-72 items-center justify-center p-6">
      <div className="w-full space-y-3" aria-label="Loading survey map">
        <Skeleton className="mx-auto h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  ),
});

export default function DashboardMapCaller({
  data,
  onSurveySelect,
  selectedSurveyId,
  surveyHrefBase = "/dashboard/surveys",
}: DashboardMapCallerProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-full min-h-72 items-center justify-center p-6">
        <p className="text-center text-sm font-medium text-muted-foreground">
          No map data available
        </p>
      </div>
    );
  }

  const validData = data.filter(
    (survey) =>
      survey &&
      survey.geojson_boundaries &&
      survey.boundaries &&
      survey.min_x != null &&
      survey.max_x != null &&
      survey.min_y != null &&
      survey.max_y != null,
  );

  if (validData.length === 0) {
    return (
      <div className="flex h-full min-h-72 items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <p className="text-sm font-medium">No mapped boundaries available</p>
          <p className="mt-1 text-xs">
            These surveys remain available in the list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardMap
      data={validData}
      onSurveySelect={onSurveySelect}
      selectedSurveyId={selectedSurveyId}
      surveyHrefBase={surveyHrefBase}
    />
  );
}
