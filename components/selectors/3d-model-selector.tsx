"use client";

import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";

export function ThreeDimensionalModelSelector({ models }: { models: { url: string }[] }) {
  const selected3dModel = useSurveyMapStore((state) => state.selected3dModel);
  const setSelected3dModel = useSurveyMapStore((state) => state.setSelected3dModel);
  useEffect(() => {
    const next = models.some((model) => model.url === selected3dModel) ? selected3dModel : models[0]?.url ?? "";
    if (next !== selected3dModel) setSelected3dModel(next);
  }, [models, selected3dModel, setSelected3dModel]);
  if (!models.length) return <span className="text-sm text-muted-foreground">No 3D available for this survey.</span>;
  return (
    <Select value={selected3dModel} onValueChange={setSelected3dModel}>
      <SelectTrigger className="h-11! w-full min-w-0 sm:w-fit" aria-label="3D model type"><SelectValue placeholder="Select point cloud" /></SelectTrigger>
      <SelectContent>{models.map((model, index) => <SelectItem key={model.url} value={model.url}>Point cloud {index + 1}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function ThreeDimensionalAxesHelperSwitch() {
  const show3dAxesHelper = useSurveyMapStore((state) => state.show3dAxesHelper);
  const setShow3dAxesHelper = useSurveyMapStore((state) => state.setShow3dAxesHelper);
  return (
    <div className="flex min-h-11 items-center gap-3">
      <Switch id="3d-axes-helper-switch" checked={show3dAxesHelper} onCheckedChange={setShow3dAxesHelper} />
      <Label htmlFor="3d-axes-helper-switch" className="flex min-h-11 items-center">Show axes</Label>
    </div>
  );
}