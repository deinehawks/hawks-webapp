import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ComputerVisionObject } from "@/lib/types";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMemo } from "react";
import { Badge } from "../ui/badge";

export function FoiSelector({
  detectedObjects,
}: {
  detectedObjects: ComputerVisionObject[];
}) {
  const { selectedFoi, setSelectedFoi } = useSurveyMapStore((state) => state);

  const numHealthyBananas = useMemo(() => {
    if (!detectedObjects) return 0;
    return detectedObjects.filter(
      (object: ComputerVisionObject) =>
        object.label === "Banana Plant (Healthy-looking)"
    ).length;
  }, [detectedObjects]);

  const numUnhealthyBananas = useMemo(() => {
    if (!detectedObjects) return 0;
    return detectedObjects.filter(
      (object: ComputerVisionObject) =>
        object.label === "Banana Plant (Infected)"
    ).length;
  }, [detectedObjects]);

  return (
    <div className="flex flex-col items-center gap-2">
      <Select value={selectedFoi} onValueChange={setSelectedFoi}>
        <SelectTrigger className="w-fit" id="foi-selector">
          <Label>Crop Status:</Label>
          <SelectValue placeholder="Select feature of interest" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Feature of Interest</SelectLabel>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="healthy" className="flex gap-2">
              <span> Healthy Banana </span>
              {selectedFoi === "healthy" && (
                <Badge variant="secondary" className="rounded-full">
                  {numHealthyBananas}
                </Badge>
              )}
            </SelectItem>
            <SelectItem value="unhealthy" className="flex gap-2">
              <span> Unhealthy Banana </span>
              {selectedFoi === "unhealthy" && (
                <Badge variant="secondary" className="rounded-full">
                  {numUnhealthyBananas}
                </Badge>
              )}
            </SelectItem>
            <SelectItem value="all" className="flex gap-2">
              <span> All </span>
              {selectedFoi === "all" && (
                <Badge variant="secondary" className="rounded-full">
                  {numUnhealthyBananas + numHealthyBananas}
                </Badge>
              )}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
