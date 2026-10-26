"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, MapPinned, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSurveyLabel, type SurveyChoice } from "@/lib/helpers/survey-selection";
import { formatSurveyArea, formatSurveyDate } from "@/lib/helpers/survey-format";
import { SurveyPopupShell } from "./survey-popup-shell";

export type SurveyDetails = SurveyChoice & { location?: string | null; tags?: string | null };

export function SurveyDetailsPopup({ survey, longitude, latitude, onClose }: {
  survey: SurveyDetails;
  longitude: number;
  latitude: number;
  onClose: () => void;
}) {
  return (
    <SurveyPopupShell longitude={longitude} latitude={latitude} title={String(survey.id)}
      description={getSurveyLabel(survey) || undefined} icon={<MapPinned />} onClose={onClose}
      footer={
        <Button asChild size="sm" className="h-11 w-full justify-between rounded-lg px-3 sm:h-9">
          <Link href={`/dashboard/surveys/${survey.id}`}>
            View details <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      }>
      <dl className="space-y-3 text-sm leading-5">
        <div className="grid grid-cols-2 divide-x divide-border/60 rounded-lg border bg-muted/30 py-3">
          <div className="min-w-0 px-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Ruler aria-hidden="true" className="size-3.5" />Area</dt>
            <dd className="mt-1 break-words font-semibold tabular-nums">{formatSurveyArea(survey.area)}</dd>
          </div>
          <div className="min-w-0 px-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays aria-hidden="true" className="size-3.5" />Flight date</dt>
            <dd className="mt-1 break-words font-medium tabular-nums">{formatSurveyDate(survey.flight_date)}</dd>
          </div>
        </div>
        {survey.location && <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin aria-hidden="true" className="size-3.5" />Location</dt>
          <dd className="mt-1 break-words leading-6">{survey.location}</dd>
        </div>}
        {survey.tags && <div className="flex items-start justify-between gap-3 border-t pt-3">
          <dt className="shrink-0 text-xs text-muted-foreground">Type</dt>
          <dd className="min-w-0 text-right"><Badge variant="secondary" className="max-w-full whitespace-normal rounded-md break-words font-medium uppercase">{survey.tags}</Badge></dd>
        </div>}
      </dl>
    </SurveyPopupShell>
  );
}
