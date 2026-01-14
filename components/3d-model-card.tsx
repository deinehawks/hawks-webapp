import { three_dimensional_models } from "@/data/3d-models";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import { ThreeDimensionalAxesHelperSwitch } from "./selectors/3d-model-selector";

export function ThreeDimensionalModelCard() {
  const { selected3dModel } = useSurveyMapStore((state) => state);

  const model = three_dimensional_models.find(
    (model) => model.code.toLowerCase() === selected3dModel
  );

  if (!model) return null;

  const [summary, details] = model.description.split(".");

  return (
    <div className="flex flex-col gap-4">
      {/* Description */}
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {summary}.
        </p>

        {details && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {details}.
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="pt-2 border-t">
        <ThreeDimensionalAxesHelperSwitch />
      </div>
    </div>
  );
}
