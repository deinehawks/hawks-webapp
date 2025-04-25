import { digital_elevation_models } from "@/data/elevation-models";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DemColorSelector,
  DemShadingSelector,
} from "./selectors/dem-selectors";

export function ElevationModelCard() {
  const { selectedDemType, selectedDemColor, selectedDemShading } =
    useSurveyMapStore((state) => state);

  const dem = digital_elevation_models.find(
    (model) => model.code.toLocaleLowerCase() === selectedDemType
  );

  if (!dem) return null;

  return (
    <div className="flex flex-1 my-2 flex-col gap-4">
      <CardHeader>
        <CardTitle>{dem.code}</CardTitle>
        <CardDescription>{dem.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div>{dem.description.split(".").at(0)}&#46;</div>
          <div>{dem.description.split(".").at(1)}&#46;</div>
          <DemColorSelector />
          <DemShadingSelector />
        </div>
      </CardContent>
    </div>
  );
}
