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

export function ThreeDimensionalModelSelector({ code }) {
  const { selected3dModel, setSelected3dModel } = useSurveyMapStore(
    (state) => state
  );

  return (
    <Select value={selected3dModel} onValueChange={setSelected3dModel}>
      <SelectTrigger className="w-fit" id="3d-model-selector">
        <Label> Model: </Label>
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
          {/* {three_dimensional_models.map((model) => (
            <SelectItem key={model.code} value={model.code}>
              <div className="flex gap-2">
                <span>{model.name}</span>
              </div>
            </SelectItem>
          ))} */}
        </SelectGroup>
      </SelectContent>
    </Select>
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
