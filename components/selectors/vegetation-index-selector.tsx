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
import { Label } from "../ui/label";
import { vegetationIndices } from "@/data/vegetation-indices";

export function VegetationIndexSelector() {
  const { selectedVegetationIndex, setSelectedVegetationIndex } =
    useSurveyMapStore((state) => state);

  return (
    <Select
      value={selectedVegetationIndex}
      onValueChange={setSelectedVegetationIndex}
    >
      <SelectTrigger className="w-fit" id="vegetation-index-selector">
        <Label>Index:</Label>
        <SelectValue placeholder="Select vegetation index" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Vegetation Indices</SelectLabel>
          {vegetationIndices.map((index) => (
            <SelectItem key={index.code} value={index.code.toLowerCase()}>
              <div className="flex gap-1">
                <span> {index.code} </span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
