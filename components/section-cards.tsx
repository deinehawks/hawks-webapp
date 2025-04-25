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
  ChevronsDownUpIcon,
  ChevronsUpIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  MinusIcon,
  MoveRightIcon,
  MoveUpIcon,
  PercentCircleIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useMemo } from "react";

export function SectionCards({
  surveys,
  detectedObjects,
}: {
  surveys: any;
  detectedObjects: ComputerVisionObject[];
}) {
  const numNewSurveys = useMemo(() => {
    if (!surveys) return 0;
    return surveys
      .map((survey) => survey.flight_date)
      .filter((date: Date) => isAfter(date, subMonths(new Date(), 6))).length;
  }, [surveys]);

  const landMeasureNewSurveys = useMemo(() => {
    if (!surveys) return 0;
    const datesInLastSixMonths = surveys
      .map((survey) => survey.flight_date)
      .filter((date: Date) => isAfter(date, subMonths(new Date(), 6)));
    const newSurveys = surveys.filter((survey) =>
      datesInLastSixMonths.includes(survey.flight_date)
    );
    return newSurveys.reduce((acc: number, curr: number) => acc + curr.area, 0);
  }, [surveys]);

  const numHealthyBananas = useMemo(() => {
    if (!detectedObjects) return 0;
    return detectedObjects.filter(
      (object) => object.label === "Banana Plant (Healthy-looking)"
    ).length;
  }, [detectedObjects]);

  const numUnhealthyBananas = useMemo(() => {
    if (!detectedObjects) return 0;
    return detectedObjects.filter(
      (object) => object.label === "Banana Plant (Infected)"
    ).length;
  }, [detectedObjects]);

  const healthyBananaPercentage = Number(
    numHealthyBananas / (numHealthyBananas + numUnhealthyBananas)
  );

  const unhealthyBananaPercentage = Number(
    numUnhealthyBananas / (numHealthyBananas + numUnhealthyBananas)
  );

  let healthyBananaPercentageStatus;

  let unhealthyBananaPercentageStatus;

  if (healthyBananaPercentage <= 0.5) {
    healthyBananaPercentageStatus = "Very low";
  }

  if (healthyBananaPercentage > 0.5 && healthyBananaPercentage <= 0.15) {
    healthyBananaPercentageStatus = "Low";
  }
  if (healthyBananaPercentage > 0.16 && healthyBananaPercentage <= 0.3) {
    healthyBananaPercentageStatus = "Average";
  }
  if (healthyBananaPercentage > 0.3 && healthyBananaPercentage <= 0.5) {
    healthyBananaPercentageStatus = "High";
  }
  if (healthyBananaPercentage > 0.5) {
    healthyBananaPercentageStatus = "Very high";
  }

  if (unhealthyBananaPercentage <= 0.5)
    unhealthyBananaPercentageStatus = "Very low";
  if (unhealthyBananaPercentage > 0.5 && unhealthyBananaPercentage <= 0.15)
    unhealthyBananaPercentageStatus = "Low";
  if (unhealthyBananaPercentage > 0.16 && unhealthyBananaPercentage <= 0.3)
    unhealthyBananaPercentageStatus = "Average";
  if (unhealthyBananaPercentage > 0.3 && unhealthyBananaPercentage <= 0.5)
    unhealthyBananaPercentageStatus = "High";
  if (unhealthyBananaPercentage > 0.5)
    unhealthyBananaPercentageStatus = "Very high";

  return (
    <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription> No. of Surveyed Areas</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {surveys.length}
          </CardTitle>
          {/* <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <PercentCircleIcon className="size-3" /> 50%
            </Badge>
          </div> */}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <span>{numNewSurveys} new survey(s)</span>
            {numNewSurveys > 0 ? (
              <ArrowUpIcon className="size-4" />
            ) : (
              <MoveRightIcon className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            No. of surveys in the last six months
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription> Total Area Surveyed </CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {surveys
              .reduce((acc: number, curr) => acc + curr.area, 0)
              .toFixed(2)}{" "}
            ha
          </CardTitle>
          {/* <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <PercentCircleIcon className="size-3" /> 50%
            </Badge>
          </div> */}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <span>{landMeasureNewSurveys.toFixed(1)} hectare(s) added </span>
            {numNewSurveys > 0 ? (
              <ArrowUpIcon className="size-4" />
            ) : (
              <MoveRightIcon className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            Land measure of new areas surveyed
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription> Crop Count: Healthy Banana </CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {numHealthyBananas.toLocaleString()}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs ">
              <span>{(healthyBananaPercentage * 100).toFixed(2)} %</span>
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {healthyBananaPercentageStatus} healthy crop percentage{" "}
            <PercentageCategorizationIcon
              status={healthyBananaPercentageStatus}
            />
          </div>
          <div className="text-muted-foreground">
            No. of detected &quot;healthy-looking&quot; banana
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription> Crop Count: Unhealthy Banana</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {numUnhealthyBananas.toLocaleString()}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <span>{(unhealthyBananaPercentage * 100).toFixed(2)} %</span>
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {unhealthyBananaPercentageStatus} unhealthy crop percentage{" "}
            <PercentageCategorizationIcon
              status={unhealthyBananaPercentageStatus}
            />
          </div>
          <div className="text-muted-foreground">
            No. of detected &quot;unhealthy-looking&quot; banana
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

function PercentageCategorizationIcon({
  status,
}: {
  status: string | undefined;
}) {
  if (status?.toLowerCase() === "very low") {
    return <ChevronsDownIcon className="size-4" />;
  }
  if (status?.toLowerCase() === "low") {
    return <ChevronDownIcon className="size-4" />;
  }
  if (status?.toLowerCase() === "average") {
    return <ChevronsDownIcon className="size-4" />;
  }
  if (status?.toLowerCase() === "high") {
    return <ChevronUpIcon className="size-4" />;
  }
  if (status?.toLowerCase() === "very high") {
    return <ChevronsUpIcon className="size-4" />;
  }
  return null;
}
