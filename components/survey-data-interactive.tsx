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

export default function SurveyDataInteractive({ data }) {
  const { earliest, latest } = getEarliestandLatestDates(data, "flight_date");

  return (
    /* height column flex container */
    <Card className="@container/card h-full flex flex-col">
      <CardHeader>
        <CardTitle> Surveyed Areas </CardTitle>
        <CardDescription>
          {`${data.at(0).code} | ${format(earliest, "dd MMM yyyy")} - ${format(
            latest,
            "dd MMM yyyy"
          )}`}
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
