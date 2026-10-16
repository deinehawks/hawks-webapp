"use client";
import { useEffect } from "react";
import type { ComputerVisionObject } from "@/lib/types";
import { countPlantDetections, resolveDetectionFilter } from "@/lib/helpers/detection-labels";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import { useSurveyModeStore } from "@/stores/survey-mode-store";
import { PlantFilterSelect } from "@/components/maps/shared/plant-filter-select";

export function FoiSelector({ detectedObjects }: { detectedObjects: ComputerVisionObject[] }) {
  const { selectedFoi, setSelectedFoi, setPopupInfo, setHoveredPairId } = useSurveyMapStore(state => state);
  const { surveyMode } = useSurveyModeStore();
  const selection = resolveDetectionFilter(selectedFoi, surveyMode, countPlantDetections(detectedObjects).coconut > 0);
  useEffect(() => {
    if (selection !== selectedFoi) setSelectedFoi(selection);
    setPopupInfo(null);
    setHoveredPairId(null);
  }, [selection, selectedFoi, surveyMode, detectedObjects, setSelectedFoi, setPopupInfo, setHoveredPairId]);
  return <PlantFilterSelect detectedObjects={detectedObjects} mode={surveyMode} value={selection} onValueChange={setSelectedFoi} />;
}
