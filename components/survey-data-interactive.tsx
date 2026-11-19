import DashboardMapCaller from "@/components/callers/dashboard-map-caller";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getEarliestandLatestDates } from "@/lib/helpers";
import { format } from "date-fns";

type SurveySummary = {
  id: string | number;
  code?: string | null;
  flight_date?: string | null;
  geojson_boundaries: unknown;
  boundaries: unknown;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
};

export default function SurveyDataInteractive({
  data,
  surveyHrefBase = "/dashboard/surveys",
}: {
  data: SurveySummary[];
  surveyHrefBase?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <Card className="@container/card h-full flex flex-col">
        <CardHeader>
          <CardTitle>Surveyed Areas</CardTitle>
          <CardDescription>No survey data available</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm font-medium">No surveys found</p>
            <p className="text-xs mt-1">Add survey data to view the map</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { earliest, latest } = getEarliestandLatestDates(data, "flight_date");
  const surveyCode = data[0]?.code || "Unknown";

  return (
    <Card className="@container/card h-full flex flex-col">
      <CardHeader>
        <CardTitle>Surveyed Areas</CardTitle>
        <CardDescription>
          {earliest && latest
            ? `${surveyCode} | ${format(new Date(earliest), "dd MMM yyyy")} - ${format(
                new Date(latest),
                "dd MMM yyyy",
              )}`
            : surveyCode}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 w-full">
          <DashboardMapCaller data={data} surveyHrefBase={surveyHrefBase} />
        </div>
      </CardContent>
    </Card>
  );
}
