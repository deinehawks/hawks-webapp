"use client";
import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";

export function ThreeDimensionalModelSelector({ models }: { models: { url: string }[] }) {
  const { selected3dModel, setSelected3dModel } = useSurveyMapStore((s) => s);
  useEffect(() => {
    if (!models.some((m) => m.url === selected3dModel)) setSelected3dModel(models[0]?.url ?? "");
  }, [models, selected3dModel, setSelected3dModel]);
  if (!models.length) return <span>No verified point cloud available</span>;
  return <Select value={selected3dModel} onValueChange={setSelected3dModel}>
    <SelectTrigger className="w-fit"><SelectValue placeholder="Select point cloud" /></SelectTrigger>
    <SelectContent>{models.map((model, index) => <SelectItem key={model.url} value={model.url}>Point cloud {index + 1}</SelectItem>)}</SelectContent>
  </Select>;
}
export function ThreeDimensionalAxesHelperSwitch() {
  const { show3dAxesHelper, setShow3dAxesHelper } = useSurveyMapStore((s) => s);
  return <div className="flex items-center gap-2 mt-4">
    <Switch id="3d-axes-helper-switch" checked={show3dAxesHelper} onCheckedChange={setShow3dAxesHelper} />
    <Label htmlFor="3d-axes-helper-switch">Show Axes Helper</Label>
  </div>;
}
