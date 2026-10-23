"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp, Info, MapIcon } from "lucide-react";
import { MAP_COLORS } from "@/lib/constants/map-colors";
import { useSurveyModeStore } from "@/stores/survey-mode-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MapLegendProps = {
  visible?: boolean;
  forcePins?: boolean;
  onToggleForcePins?: () => void;
  title?: string;
  healthyLabel?: string;
  healthyDesc?: string;
  unhealthyLabel?: string;
  unhealthyDesc?: string;
  showHeatmapSection?: boolean;
};

export default function MapLegend({
  visible = true,
  forcePins = false,
  onToggleForcePins,
  title = "Map legend",
  healthyLabel = "Healthy-looking plants",
  healthyDesc = "Marked healthy-looking by the app",
  unhealthyLabel = "Infected plants",
  unhealthyDesc = "Marked infected by the app",
  showHeatmapSection = true,
}: MapLegendProps) {
  // Choose the initial layout once. Resizing or changing filters must not undo
  // the user's choice to expand or collapse the legend.
  const [isOpen, setIsOpen] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(min-width: 768px)").matches,
  );
  const contentId = useId();
  const { surveyMode } = useSurveyModeStore();

  if (!visible || surveyMode === "inventory") return null;

  return (
    <aside
      aria-label={title}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      className={cn(
        "absolute bottom-4 left-4 z-10 flex max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md",
        isOpen ? "w-72" : "w-fit",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((open) => !open)}
        className="h-11 w-full shrink-0 justify-start gap-2 rounded-none px-3 text-sm sm:h-9"
      >
        <MapIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        <span>{isOpen ? title : "Legend"}</span>
        {isOpen
          ? <ChevronDown aria-hidden="true" className="ml-auto size-4 text-muted-foreground" />
          : <ChevronUp aria-hidden="true" className="ml-1 size-4 text-muted-foreground" />}
      </Button>

      <div id={contentId} hidden={!isOpen} className="min-h-0 overflow-y-auto overscroll-contain border-t p-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
        <div className="space-y-3">
          {[
            { label: healthyLabel, description: healthyDesc, color: MAP_COLORS.healthy.base },
            { label: unhealthyLabel, description: unhealthyDesc, color: MAP_COLORS.unhealthy.base },
          ].map(({ label, description, color }, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded-full border border-foreground/40" style={{ backgroundColor: color }} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-5">{label}</p>
                <p className="text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {showHeatmapSection && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <p className="text-xs font-medium">Plant density</p>
            <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-sm border">
              {[0.15, 0.3, 0.45, 0.6, 0.75].map((opacity) => (
                <span key={opacity} className="flex-1" style={{ backgroundColor: `rgba(${MAP_COLORS.healthy.heatmap}, ${opacity})` }} />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Low</span><span>High</span></div>
          </div>
        )}

        {onToggleForcePins && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
            <div className="min-w-0">
              <p className="text-xs font-medium">Pin display</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Auto chooses pins or a heatmap.</p>
            </div>
            <Button type="button" variant={forcePins ? "secondary" : "outline"} size="sm"
              aria-label="Always show pins" aria-pressed={forcePins}
              onClick={onToggleForcePins} className="h-11 shrink-0 sm:h-8">
              {forcePins ? "Pins only" : "Auto"}
            </Button>
          </div>
        )}

        <p className="mt-3 flex items-start gap-2 border-t pt-3 text-xs leading-5 text-muted-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Select a plant to see its detection area.
        </p>
      </div>
    </aside>
  );
}
