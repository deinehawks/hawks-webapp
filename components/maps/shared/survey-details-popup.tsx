"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
      description={getSurveyLabel(survey) || undefined} onClose={onClose}
      footer={
        <Button asChild size="sm" className="h-11 w-full sm:h-8">
          <Link href={`/dashboard/surveys/${survey.id}`}>
            View details <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </Button>
      }>
      <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-2 pb-2 pt-1 text-xs leading-5">
        <dt className="text-muted-foreground">Area</dt>
        <dd className="text-right font-medium tabular-nums">{formatSurveyArea(survey.area)}</dd>
        <dt className="text-muted-foreground">Flight date</dt>
        <dd className="text-right tabular-nums">{formatSurveyDate(survey.flight_date)}</dd>
        {survey.location && <>
          <dt className="text-muted-foreground">Location</dt>
          <dd className="break-words text-right">{survey.location}</dd>
        </>}
        {survey.tags && <>
          <dt className="text-muted-foreground">Type</dt>
          <dd className="text-right"><Badge variant="secondary" className="rounded font-normal uppercase">{survey.tags}</Badge></dd>
        </>}
      </dl>
    </SurveyPopupShell>
  );
}
