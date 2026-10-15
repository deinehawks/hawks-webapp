"use client";

import { LayoutList, Stethoscope } from "lucide-react";
import { useSurveyModeStore } from "@/stores/survey-mode-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SurveyModeToggle({ compact = false }: { compact?: boolean }) {
  const { surveyMode, setSurveyMode } = useSurveyModeStore();

  if (compact) return (
    <div role="group" aria-label="Survey mode" className="flex h-11 shrink-0 items-center gap-0.5 rounded-md bg-muted p-0.5 sm:h-8">
      {(["analysis", "inventory"] as const).map((mode) => {
        const Icon = mode === "analysis" ? Stethoscope : LayoutList;
        return <Button key={mode} type="button" variant="ghost" size="sm"
          aria-pressed={surveyMode === mode} onClick={() => setSurveyMode(mode)}
          className={cn("h-full gap-1.5 px-2.5 text-xs", surveyMode === mode
            ? "bg-background text-foreground shadow-xs hover:bg-background"
            : "text-muted-foreground")}>
          <Icon aria-hidden="true" className="size-3.5" />
          {mode === "analysis" ? "Analysis" : "Inventory"}
        </Button>;
      })}
    </div>
  );

  return (
    <div role="group" aria-label="Survey mode" className="flex items-center gap-1 rounded-lg border bg-muted p-1 h-9">
      <button
        aria-pressed={surveyMode === "analysis"}
        onClick={() => setSurveyMode("analysis")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-all",
          surveyMode === "analysis"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Stethoscope className="h-3.5 w-3.5" />
        Analysis
      </button>
      <button
        aria-pressed={surveyMode === "inventory"}
        onClick={() => setSurveyMode("inventory")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-all",
          surveyMode === "inventory"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutList className="h-3.5 w-3.5" />
        Inventory
      </button>
    </div>
  );
}
