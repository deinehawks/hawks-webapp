"use client";

import { Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MAP_COLORS } from "@/lib/constants/map-colors";
import {
  getDetectionPlantName, getDetectionPlantType, normalizeDetectionLabels,
  HEALTHY_BANANA_LABEL, INFECTED_BANANA_LABEL,
} from "@/lib/helpers/detection-labels";
import { SurveyPopupShell } from "./survey-popup-shell";

export function PlantDetailsPopup({ longitude, latitude, label, surveyId, mode, onClose }: {
  longitude: number;
  latitude: number;
  label?: string | null;
  surveyId?: string | null;
  mode: string;
  onClose: () => void;
}) {
  const inventory = mode === "inventory";
  const normalized = normalizeDetectionLabels([{ label }])[0].label;
  const species = getDetectionPlantType(label);
  const healthy = normalized === HEALTHY_BANANA_LABEL;
  const infected = normalized === INFECTED_BANANA_LABEL;
  const value = inventory ? species ? getDetectionPlantName(label) : "—"
    : healthy ? "Healthy-looking" : infected ? "Infected" : "—";
  const color = inventory ? species === "coconut" ? MAP_COLORS.coconut.base : species === "banana" ? MAP_COLORS.inventory.base : undefined
    : healthy ? MAP_COLORS.healthy.base : infected ? MAP_COLORS.unhealthy.base : undefined;
  const coordinate = (number: number) => Number.isFinite(number) ? number.toFixed(6) : "—";

  return <SurveyPopupShell longitude={longitude} latitude={latitude} title="Plant information"
    description={surveyId ? `Survey ${surveyId}` : inventory ? "Crop inventory" : "Health analysis"}
    icon={<Sprout />} width={288} closeLabel="Close plant popup" onClose={onClose}>
    <div className="space-y-3">
      <dl className="flex items-center justify-between gap-3 text-sm">
        <dt className="text-xs text-muted-foreground">{inventory ? "Plant type" : "Status"}</dt>
        <dd><Badge variant="outline" className="gap-1.5 rounded-md font-medium">
          {color && <span aria-hidden="true" className="size-2 shrink-0 rounded-full border border-foreground/15" style={{ backgroundColor: color }} />}
          {value}
        </Badge></dd>
      </dl>
      <dl className="grid grid-cols-2 divide-x divide-border/60 rounded-lg border bg-muted/30 py-3">
        <div className="min-w-0 px-3">
          <dt className="text-xs text-muted-foreground">Longitude</dt>
          <dd className="mt-1 break-words font-mono text-[13px] font-medium tabular-nums">{coordinate(longitude)}</dd>
        </div>
        <div className="min-w-0 px-3">
          <dt className="text-xs text-muted-foreground">Latitude</dt>
          <dd className="mt-1 break-words font-mono text-[13px] font-medium tabular-nums">{coordinate(latitude)}</dd>
        </div>
      </dl>
    </div>
  </SurveyPopupShell>;
}
