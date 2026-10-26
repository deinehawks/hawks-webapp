"use client";

import { CalendarDays, ChevronRight, Layers, Ruler } from "lucide-react";
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
      title="Choose survey" description={`${choice.surveys.length} surveys overlap here`}
      icon={<Layers />} contentClassName="px-2 pb-2" onClose={onClose}>
      <div className="divide-y divide-border/60">
        {choice.surveys.map((survey) => (
          <Button key={survey.id} type="button" variant="ghost" onClick={() => onChoose(survey)}
            aria-label={`Select survey ${survey.id}${getSurveyLabel(survey) ? `, ${getSurveyLabel(survey)}` : ""}`}
            className="group h-auto min-h-20 w-full justify-start gap-3 whitespace-normal rounded-lg px-3 py-3 text-left focus-visible:bg-accent">
            <span className="min-w-0 flex-1">
              <span className="block break-words text-sm font-semibold leading-5">{survey.id}</span>
              {getSurveyLabel(survey) && <span className="mt-0.5 block break-words text-xs font-normal leading-5 text-muted-foreground">{getSurveyLabel(survey)}</span>}
              <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal tabular-nums text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" className="size-3" />{formatSurveyDate(survey.flight_date)}</span>
                <span className="inline-flex items-center gap-1.5"><Ruler aria-hidden="true" className="size-3" />{formatSurveyArea(survey.area)}</span>
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground group-focus-visible:text-foreground" />
          </Button>
        ))}
      </div>
    </SurveyPopupShell>
  );
}
