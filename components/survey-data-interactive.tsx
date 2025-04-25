import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MapCaller from "@/components/callers/map-caller";
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
          <MapCaller data={data} />
        </div>
      </CardContent>
    </Card>
  );
}
