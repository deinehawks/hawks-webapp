"use client";

import { LayoutList, Stethoscope } from "lucide-react";
import { useSurveyModeStore } from "@/stores/survey-mode-store";
import { cn } from "@/lib/utils";

export function SurveyModeToggle() {
  const { surveyMode, setSurveyMode } = useSurveyModeStore();

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted p-1 h-9">
      <button
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
