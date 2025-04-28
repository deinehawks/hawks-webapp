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
    <Card className="@container/card">
      <CardHeader>
        <CardTitle> Surveyed Areas </CardTitle>
        <CardDescription>
          {" "}
          {`${data.at(0).code} | ${format(earliest, "dd MMM yyyy")} - ${format(
            latest,
            "dd MMM yyyy"
          )}`}{" "}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-96">
          <DashboardMapCaller data={data} />
        </div>
      </CardContent>
    </Card>
  );
}
