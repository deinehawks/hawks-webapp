"use client";

import {
  CalendarDays,
  CircleCheck,
  CircleMinus,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SurveyTimelineEntry,
  SurveyTimelineState,
} from "@/lib/surveys/timeline";
import { cn } from "@/lib/utils";

function formatFlightDate(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function availabilityLabel(entry: SurveyTimelineEntry): string {
  const outputs = [
    entry.hasOrthomosaic ? "Orthomosaic" : null,
    entry.has3DModel ? "3D" : null,
  ].filter(Boolean);
  return outputs.length > 0 ? outputs.join(" and ") : "No current outputs";
}

function AvailabilityBadge({
  available,
  label,
}: {
  available: boolean;
  label: string;
}) {
  const Icon = available ? CircleCheck : CircleMinus;

  return (
    <Badge
      aria-label={`${label} ${available ? "available" : "unavailable"}`}
      className={cn(
        "gap-1.5 border-border/70 bg-background px-2 py-1 text-muted-foreground",
        available && "border-primary/20 bg-primary/10 text-primary",
      )}
      variant="outline"
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}

function TimelineAvailability({
  entry,
}: {
  entry: SurveyTimelineEntry;
}) {
  return (
    <div
      aria-label={availabilityLabel(entry)}
      className="flex flex-wrap gap-1.5"
      role="group"
    >
      <AvailabilityBadge available={entry.hasOrthomosaic} label="Ortho" />
      <AvailabilityBadge available={entry.has3DModel} label="3D" />
    </div>
  );
}

function statusDescription(timeline: SurveyTimelineState): string {
  switch (timeline.status) {
    case "missing-area-identity":
      return "A survey code and area code are required before this survey can appear on a chronological timeline.";
    case "missing-flight-date":
      return "A flight date is required before this survey can appear on a chronological timeline.";
    case "current-only":
      return "This is the only authorized dated survey recorded for this area.";
    case "ready":
      return `Browse ${timeline.entries.length} authorized dated surveys recorded for this area.`;
  }
}

function emptyStateLabel(timeline: SurveyTimelineState): string | null {
  switch (timeline.status) {
    case "missing-area-identity":
      return "Survey code and area code required";
    case "missing-flight-date":
      return "Flight date required";
    case "current-only":
    case "ready":
      return null;
  }
}

function SurveyContext({
  entry,
}: {
  entry: SurveyTimelineEntry;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="truncate text-xs font-medium text-foreground/80">
        {entry.id}
      </p>
      <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{entry.location || "Location not set"}</span>
      </p>
    </div>
  );
}

export function SurveyTimeline({
  currentSurveyId,
  hrefBase,
  timeline,
}: {
  currentSurveyId: string;
  hrefBase: string;
  timeline: SurveyTimelineState;
}) {
  const router = useRouter();
  const currentEntry = timeline.entries.find(
    (entry) => entry.id === currentSurveyId,
  );
  const emptyLabel = emptyStateLabel(timeline);
  const hrefFor = (surveyId: string) =>
    `${hrefBase}/${encodeURIComponent(surveyId)}`;

  return (
    <section
      aria-labelledby="survey-timeline-title"
      className="px-4 pt-4 lg:px-6"
    >
      <Card className="h-auto gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-row items-start gap-3 px-4 py-4 sm:px-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle id="survey-timeline-title" className="text-base">
                Survey timeline
              </CardTitle>
              {timeline.entries.length > 0 ? (
                <Badge
                  className="font-normal text-muted-foreground"
                  variant="secondary"
                >
                  {timeline.entries.length}{" "}
                  {timeline.entries.length === 1 ? "survey" : "surveys"}
                </Badge>
              ) : null}
            </div>
            <CardDescription className="mt-1 max-w-2xl leading-relaxed">
              {statusDescription(timeline)}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
          {emptyLabel ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-3.5 py-3">
              <CalendarDays
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm font-medium">{emptyLabel}</p>
            </div>
          ) : null}

          {timeline.entries.length > 0 ? (
            <>
              <div className="@3xl/main:hidden">
                <label
                  className="mb-2 block text-xs font-medium text-muted-foreground"
                  htmlFor="survey-timeline-select"
                >
                  Select survey
                </label>
                <Select
                  value={currentSurveyId}
                  onValueChange={(surveyId) => router.push(hrefFor(surveyId))}
                  disabled={timeline.entries.length <= 1}
                >
                  <SelectTrigger
                    id="survey-timeline-select"
                    className="h-10 w-full bg-background"
                  >
                    <SelectValue placeholder="Select a survey" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeline.entries.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {formatFlightDate(entry.flightDate)} - {entry.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {currentEntry ? (
                  <div className="mt-3 rounded-lg border bg-muted/20 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <time
                          className="block text-base font-semibold tracking-tight"
                          dateTime={currentEntry.flightDate}
                        >
                          {formatFlightDate(currentEntry.flightDate)}
                        </time>
                        <div className="mt-1.5">
                          <SurveyContext entry={currentEntry} />
                        </div>
                      </div>
                      <Badge className="shrink-0">Current</Badge>
                    </div>
                    <div className="mt-3 border-t pt-3">
                      <TimelineAvailability entry={currentEntry} />
                    </div>
                  </div>
                ) : null}
              </div>

              <nav
                aria-label="Dated surveys"
                className="@3xl/main:flex hidden snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 [scrollbar-width:thin]"
              >
                {timeline.entries.map((entry) => {
                  const isCurrent = entry.id === currentSurveyId;

                  return (
                    <Link
                      key={entry.id}
                      aria-current={isCurrent ? "page" : undefined}
                      aria-label={`${isCurrent ? "Current survey, " : ""}${entry.id}, flown ${formatFlightDate(entry.flightDate)}`}
                      className={cn(
                        "group min-w-64 snap-start rounded-lg border bg-background p-3.5",
                        "transition-[border-color,background-color,box-shadow]",
                        "hover:border-primary/40 hover:bg-accent/40 hover:shadow-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isCurrent &&
                          "border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/10",
                      )}
                      href={hrefFor(entry.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <time
                          className="text-base font-semibold tracking-tight"
                          dateTime={entry.flightDate}
                        >
                          {formatFlightDate(entry.flightDate)}
                        </time>
                        {isCurrent ? (
                          <Badge className="shrink-0">Current</Badge>
                        ) : null}
                      </div>
                      <div className="mt-2">
                        <SurveyContext entry={entry} />
                      </div>
                      <div className="mt-3 border-t pt-3">
                        <TimelineAvailability entry={entry} />
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
