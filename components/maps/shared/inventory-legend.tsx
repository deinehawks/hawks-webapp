"use client";

import { MAP_COLORS } from "@/lib/constants/map-colors";
import { countPlantDetections } from "@/lib/helpers/detection-labels";
import type { ComputerVisionObject } from "@/lib/types";

export function InventoryLegend({ detectedObjects }: { detectedObjects: ComputerVisionObject[] }) {
  const counts = countPlantDetections(detectedObjects);
  if (!counts.coconut) return null;
  return <div role="note" aria-label="Inventory map legend"
    className="absolute bottom-16 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-sm sm:bottom-8 sm:left-5">
    {counts.banana > 0 && <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: MAP_COLORS.inventory.base }} />Banana</span>}
    <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: MAP_COLORS.coconut.base }} />Coconut</span>
  </div>;
}
