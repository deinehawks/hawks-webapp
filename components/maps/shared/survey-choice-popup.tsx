"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSurveyLabel, type SurveyChoice } from "@/lib/helpers/survey-selection";
import { formatSurveyArea, formatSurveyDate } from "@/lib/helpers/survey-format";
import { SurveyPopupShell } from "./survey-popup-shell";

export type SurveyChoiceLocation<T extends SurveyChoice = SurveyChoice> = {
  longitude: number;
  latitude: number;
  surveys: T[];
};

export function SurveyChoicePopup<T extends SurveyChoice>({ choice, onChoose, onClose }: {
  choice: SurveyChoiceLocation<T>;
  onChoose: (survey: T) => void;
  onClose: () => void;
}) {
  return (
    <SurveyPopupShell longitude={choice.longitude} latitude={choice.latitude}
      title="Choose survey" description={`${choice.surveys.length} surveys overlap here`} onClose={onClose}>
      <div className="space-y-0.5">
        {choice.surveys.map((survey) => (
          <Button key={survey.id} type="button" variant="ghost" onClick={() => onChoose(survey)}
            className="h-auto min-h-16 w-full justify-start gap-2 whitespace-normal px-2 py-2.5 text-left sm:min-h-14">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-sm font-medium">{survey.id}</span>
                <span className="text-xs font-normal tabular-nums text-muted-foreground">{formatSurveyArea(survey.area)}</span>
              </span>
              <span className="mt-0.5 flex flex-wrap gap-x-1 text-xs font-normal text-muted-foreground">
                {getSurveyLabel(survey) && <span>{getSurveyLabel(survey)} ·</span>}
                <span>{formatSurveyDate(survey.flight_date)}</span>
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          </Button>
        ))}
      </div>
    </SurveyPopupShell>
  );
}
