"use client";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countPlantDetections, resolveDetectionFilter } from "@/lib/helpers/detection-labels";
import type { ComputerVisionObject } from "@/lib/types";
import { ListFilter } from "lucide-react";
import { useMemo } from "react";

export function PlantFilterSelect({ detectedObjects, mode, value, onValueChange }: {
  detectedObjects: ComputerVisionObject[];
  mode: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const counts = useMemo(() => countPlantDetections(detectedObjects), [detectedObjects]);
  const selected = resolveDetectionFilter(value, mode, counts.coconut > 0);
  const options = [
    { value: "none", label: "No overlay", count: null },
    ...(mode === "analysis" ? [
      { value: "healthy", label: "Healthy", count: counts.healthy },
      { value: "unhealthy", label: "Infected", count: counts.unhealthy },
    ] : counts.coconut > 0 ? [
      { value: "banana", label: "Banana", count: counts.banana },
      { value: "coconut", label: "Coconut", count: counts.coconut },
    ] : []),
    { value: "all", label: "All plants", count: mode === "inventory" ? counts.total : counts.banana },
  ];
  const current = options.find(option => option.value === selected);
  const label = mode === "inventory" ? "Plant type" : "Crop status";
  return <Select value={selected} onValueChange={onValueChange}>
    <SelectTrigger className="w-full min-w-0 shrink-0 data-[size=default]:h-11 sm:w-auto sm:min-w-52 sm:data-[size=default]:h-8 [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:text-left"
      id="foi-selector" aria-label={label}>
      <ListFilter aria-hidden="true" className="size-3.5 text-muted-foreground" />
      <SelectValue placeholder={label}>{current?.label ?? label}</SelectValue>
      {current?.count != null && <Badge variant="secondary" className="shrink-0 rounded-full tabular-nums"
        aria-label={`${current.count.toLocaleString("en-US")} plants`}>{current.count.toLocaleString("en-US")}</Badge>}
    </SelectTrigger>
    <SelectContent><SelectGroup><SelectLabel>{label}</SelectLabel>
      {options.map(option => <SelectItem key={option.value} value={option.value} className="min-h-11 sm:min-h-8">
        <span>{option.label}</span>
        {option.count != null && <span className="ml-2 text-muted-foreground tabular-nums">{option.count.toLocaleString("en-US")}</span>}
      </SelectItem>)}
    </SelectGroup></SelectContent>
  </Select>;
}
