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
import type { ComponentProps } from "react";

export default function SurveyDataInteractive({ data }: ComponentProps<typeof DashboardMapCaller>) {
  // Early return if no data
  if (!data || data.length === 0) {
    return (
      <Card className="@container/card h-full flex flex-col">
        <CardHeader>
          <CardTitle>Surveyed Areas</CardTitle>
          <CardDescription>No survey data available</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm font-medium">No surveys are available for this account yet.</p>
            <p className="text-xs mt-1">Your survey map will appear here when data is available.</p>
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
          {/* Handle null dates */}
          {earliest && latest
            ? `${surveyCode} | ${format(
                new Date(earliest),
                "dd MMM yyyy"
              )} - ${format(new Date(latest), "dd MMM yyyy")}`
            : surveyCode}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 w-full">
          <DashboardMapCaller data={data} />
        </div>
      </CardContent>
    </Card>
  );
}
