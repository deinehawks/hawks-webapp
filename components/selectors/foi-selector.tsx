"use client";
import { useEffect, useMemo } from "react";
import type { ComputerVisionObject } from "@/lib/types";
import { countPlantDetections, resolveDetectionFilter, type DemoCountMultipliers } from "@/lib/helpers/detection-labels";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import { useSurveyModeStore } from "@/stores/survey-mode-store";
import { PlantFilterSelect } from "@/components/maps/shared/plant-filter-select";

export function FoiSelector({ detectedObjects, demoCountMultipliers }: { detectedObjects: ComputerVisionObject[]; demoCountMultipliers?: DemoCountMultipliers }) {
  const { selectedFoi, setSelectedFoi, setPopupInfo, setHoveredPairId } = useSurveyMapStore(state => state);
  const { surveyMode } = useSurveyModeStore();
  const counts = useMemo(() => countPlantDetections(detectedObjects), [detectedObjects]);
  const selection = resolveDetectionFilter(selectedFoi, surveyMode, counts.coconut > 0);
  useEffect(() => {
    if (selection !== selectedFoi) setSelectedFoi(selection);
    setPopupInfo(null);
    setHoveredPairId(null);
  }, [selection, selectedFoi, surveyMode, detectedObjects, setSelectedFoi, setPopupInfo, setHoveredPairId]);
  return <PlantFilterSelect detectedObjects={detectedObjects} mode={surveyMode} value={selection} onValueChange={setSelectedFoi} demoCountMultipliers={demoCountMultipliers} />;
}
