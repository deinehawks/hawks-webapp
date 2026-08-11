import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function ThreeDimensionalModelSelector({
  hasPointCloud,
  hasPhotogrammetryModel,
  hasLidarModel,
  disabled = false,
}: {
  hasPointCloud: boolean;
  hasPhotogrammetryModel: boolean;
  hasLidarModel: boolean;
  disabled?: boolean;
}) {
  const { selected3dModel, setSelected3dModel } = useSurveyMapStore((s) => s);

  const isDisabled = disabled || !hasPointCloud;

  useEffect(() => {
    if (isDisabled) return;
    if (selected3dModel) return;

    if (hasLidarModel) setSelected3dModel("pcd-lidar");
    else if (hasPhotogrammetryModel) setSelected3dModel("pcd-odm");
    else setSelected3dModel("pcd");
  }, [
    isDisabled,
    selected3dModel,
    hasLidarModel,
    hasPhotogrammetryModel,
    setSelected3dModel,
  ]);

  if (isDisabled) {
    return (
      <div className="w-fit">
        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted cursor-not-allowed opacity-50">
          <Label className="text-muted-foreground">Model:</Label>
          <span className="text-sm text-muted-foreground">
            No 3D model available
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-fit">
      <Select value={selected3dModel} onValueChange={setSelected3dModel}>
        <SelectTrigger className="w-fit" id="3d-model-selector">
          <Label>Model:</Label>
          <SelectValue placeholder="Select 3D model" />
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            <SelectLabel>3D Models</SelectLabel>

            {hasLidarModel && (
              <SelectItem value="pcd-lidar">Point Cloud (LiDAR)</SelectItem>
            )}

            {hasPhotogrammetryModel && (
              <SelectItem value="pcd-odm">
                Point Cloud (Photogrammetry)
              </SelectItem>
            )}

            {!hasLidarModel && !hasPhotogrammetryModel && (
              <SelectItem value="pcd">Point Cloud</SelectItem>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function ThreeDimensionalAxesHelperSwitch() {
  const { show3dAxesHelper, setShow3dAxesHelper } = useSurveyMapStore(
    (state) => state,
  );

  return (
    <div className="flex items-center gap-2 mt-4">
      <Switch
        id="3d-axes-helper-switch"
        checked={show3dAxesHelper}
        onCheckedChange={setShow3dAxesHelper}
      />
      <Label htmlFor="3d-axes-helper-switch">Show Axes Helper</Label>
    </div>
  );
}
