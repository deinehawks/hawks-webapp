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
import { three_dimensional_models } from "@/data/3d-models";
import { Switch } from "../ui/switch";

export function ThreeDimensionalModelSelector({
  code,
  disabled = false,
}: {
  code: string;
  disabled?: boolean;
}) {
  const { selected3dModel, setSelected3dModel } = useSurveyMapStore(
    (state) => state
  );

  if (disabled) {
    return (
      <div className="w-fit">
        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted cursor-not-allowed opacity-50">
          <Label className="text-muted-foreground">Model:</Label>
          <span className="text-sm text-muted-foreground">
            No 3D model available
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          3D model data is not available for this survey
        </p>
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
            {(code === "JXA" || code === "MXL") && (
              <SelectItem value="pcd-lidar">
                <span>Point Cloud (LiDAR)</span>
              </SelectItem>
            )}
            <SelectItem value="pcd-odm">
              <span>Point Cloud (Photogrammetry)</span>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function ThreeDimensionalAxesHelperSwitch() {
  const { show3dAxesHelper, setShow3dAxesHelper } = useSurveyMapStore(
    (state) => state
  );

  return (
    <div className="flex items-center gap-2 mt-4">
      <Switch
        id="3d-axes-helper-swtich"
        checked={show3dAxesHelper}
        onCheckedChange={setShow3dAxesHelper}
      />
      <Label htmlFor="3d-axes-helper-switch"> Show Axes Helper </Label>
    </div>
  );
}
