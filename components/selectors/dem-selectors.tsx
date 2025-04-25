import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SelectValue } from "@radix-ui/react-select";
import { digital_elevation_models } from "@/data/elevation-models";

const DEM_COLORS = ["viridis", "jet", "earth", "terrain", "pastel"];
const DEM_SHADINGS = ["none", "normal", "extruded"];

export function DemSelector() {
  const { selectedDemType, setSelectedDemType } = useSurveyMapStore(
    (state) => state
  );

  return (
    <Select value={selectedDemType} onValueChange={setSelectedDemType}>
      <SelectTrigger className="w-fit" id="dem-selector">
        <Label>DEM:</Label>
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Digital Elevation Models</SelectLabel>
          {digital_elevation_models.map((dem) => (
            <SelectItem key={dem.code} value={dem.code.toLowerCase()}>
              {dem.code}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function DemColorSelector() {
  const { selectedDemColor, setSelectedDemColor } = useSurveyMapStore(
    (state) => state
  );

  return (
    <Select value={selectedDemColor} onValueChange={setSelectedDemColor}>
      <SelectTrigger className="w-fit" id="dem-color-selector">
        <Label>Color: </Label>
        <SelectValue placeholder="Select color" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Color Ramps</SelectLabel>
          {DEM_COLORS.map((color) => (
            <SelectItem key={color} value={color}>
              <span className="capitalize">{color}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function DemShadingSelector() {
  const { selectedDemShading, setSelectedDemShading } = useSurveyMapStore(
    (state) => state
  );

  return (
    <Select value={selectedDemShading} onValueChange={setSelectedDemShading}>
      <SelectTrigger className="w-fit" id="dem-shading-selector">
        <Label>Shading:</Label>
        <SelectValue placeholder="Select shading" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Color Ramps</SelectLabel>
          {DEM_SHADINGS.map((shading) => (
            <SelectItem key={shading} value={shading}>
              <span className="capitalize">{shading}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
