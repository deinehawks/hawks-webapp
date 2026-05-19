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
import { useSurveyModeStore } from "@/stores/survey-mode-store";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo } from "react";
import { Badge } from "../ui/badge";

export function FoiSelector({
  detectedObjects,
}: {
  detectedObjects: ComputerVisionObject[];
}) {
  const { selectedFoi, setSelectedFoi } = useSurveyMapStore((state) => state);
  const { surveyMode } = useSurveyModeStore();

  const numHealthyBananas = useMemo(() => {
    if (!detectedObjects) return 0;
    return detectedObjects.filter(
      (object: ComputerVisionObject) =>
        object.label === "Banana Plant (Healthy-looking)",
    ).length;
  }, [detectedObjects]);

  const numUnhealthyBananas = useMemo(() => {
    if (!detectedObjects) return 0;
    return detectedObjects.filter(
      (object: ComputerVisionObject) =>
        object.label === "Banana Plant (Infected)",
    ).length;
  }, [detectedObjects]);

  // Reset to "all" when switching to inventory while on a health-specific filter
  useEffect(() => {
    if (
      surveyMode === "inventory" &&
      (selectedFoi === "healthy" || selectedFoi === "unhealthy")
    ) {
      setSelectedFoi("all");
    }
  }, [surveyMode, selectedFoi, setSelectedFoi]);

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
            {surveyMode === "analysis" && (
              <>
                <SelectItem value="healthy" className="flex gap-2">
                  <span>Healthy Banana</span>
                  {selectedFoi === "healthy" && (
                    <Badge variant="secondary" className="rounded-full">
                      {numHealthyBananas}
                    </Badge>
                  )}
                </SelectItem>
                <SelectItem value="unhealthy" className="flex gap-2">
                  <span>Unhealthy Banana</span>
                  {selectedFoi === "unhealthy" && (
                    <Badge variant="secondary" className="rounded-full">
                      {numUnhealthyBananas}
                    </Badge>
                  )}
                </SelectItem>
              </>
            )}
            <SelectItem value="all" className="flex gap-2">
              <span>All</span>
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
