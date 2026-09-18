"use client";

import DashboardMapCaller from "@/components/callers/dashboard-map-caller";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComputerVisionObject, Survey } from "@/lib/types";
import {
  BoxIcon,
  CalendarDaysIcon,
  ImageIcon,
  ListIcon,
  MapIcon,
  MapPinIcon,
  RotateCcwIcon,
  SearchIcon,
  SproutIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";

type AvailabilityFilter = "all" | "orthomosaic" | "point_cloud" | "detections";
type SurveySort = "newest" | "oldest" | "id";

type ExplorerView = "list" | "map";
function dateValue(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function formatUtcDate(value: string | null): string {
  const parsed = dateValue(value);
  if (parsed == null) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parsed));
}

function formatArea(area: number | null): string {
  return typeof area === "number" && Number.isFinite(area)
    ? area.toFixed(2) + " ha"
    : "Not available";
}

function SurveyAvailabilityBadges({
  hasDetections,
  survey,
}: {
  hasDetections: boolean;
  survey: Survey;
}) {
  const hasOutput = Boolean(survey.ortho || survey.point_cloud || hasDetections);
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Available survey data">
      {survey.ortho ? (
        <Badge variant="secondary" className="gap-1">
          <ImageIcon className="size-3" aria-hidden="true" />
          Orthomap
        </Badge>
      ) : null}
      {survey.point_cloud ? (
        <Badge variant="secondary" className="gap-1">
          <BoxIcon className="size-3" aria-hidden="true" />
          3D
        </Badge>
      ) : null}
      {hasDetections ? (
        <Badge variant="secondary" className="gap-1">
          <SproutIcon className="size-3" aria-hidden="true" />
          Detections
        </Badge>
      ) : null}
      {!hasOutput ? <Badge variant="outline">No outputs available</Badge> : null}
    </div>
  );
}

function SurveyResultCard({
  detectionCount,
  orthomapHrefBase,
  survey,
  surveyHrefBase,
}: {
  detectionCount: number;
  orthomapHrefBase: string;
  survey: Survey;
  surveyHrefBase: string;
}) {
  const surveyId = String(survey.id);
  const clientCode = survey.client?.code || survey.code;
  return (
    <article className="rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Survey
          </p>
          <h3 className="truncate text-base font-semibold" title={surveyId}>
            {surveyId}
          </h3>
        </div>
        <Badge variant="outline" className="shrink-0">
          {survey.status || "Status unavailable"}
        </Badge>
      </div>
      <dl className="mt-3 grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <CalendarDaysIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div><dt className="sr-only">Flight date</dt><dd>{formatUtcDate(survey.flight_date)}</dd></div>
        </div>
        <div className="flex items-start gap-2">
          <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="sr-only">Location</dt>
            <dd className="line-clamp-2">{survey.location || "Not available"}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div><dt className="sr-only">Area</dt><dd>{formatArea(survey.area)}</dd></div>
        </div>
      </dl>
      <div className="mt-3">
        <SurveyAvailabilityBadges hasDetections={detectionCount > 0} survey={survey} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button asChild size="sm">
          <Link href={surveyHrefBase + "/" + encodeURIComponent(surveyId)}>View survey</Link>
        </Button>
        {clientCode ? (
          <Button asChild size="sm" variant="outline">
            <Link href={orthomapHrefBase + "/" + encodeURIComponent(clientCode)}>
              View Orthomap
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled>Orthomap unavailable</Button>
        )}
      </div>
    </article>
  );
}

export function DashboardSurveyExplorer({
  detectedObjects,
  orthomapHrefBase,
  surveyHrefBase,
  surveys,
}: {
  detectedObjects: ComputerVisionObject[];
  orthomapHrefBase: string;
  surveyHrefBase: string;
  surveys: Survey[];
}) {
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SurveySort>("newest");
  const [view, setView] = useState<ExplorerView>("list");

  const detectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const object of detectedObjects) {
      counts.set(object.areaCode, (counts.get(object.areaCode) ?? 0) + 1);
    }
    return counts;
  }, [detectedObjects]);

  const visibleSurveys = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return surveys
      .filter((survey) => {
        const surveyId = String(survey.id);
        const searchable = [
          surveyId,
          survey.area_code,
          survey.location,
          survey.client?.code,
          survey.client?.name,
        ].filter(Boolean).join(" ").toLocaleLowerCase();
        if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
        if (availability === "orthomosaic") return Boolean(survey.ortho);
        if (availability === "point_cloud") return Boolean(survey.point_cloud);
        if (availability === "detections") {
          return (detectionCounts.get(surveyId) ?? 0) > 0;
        }
        return true;
      })
      .sort((left, right) => {
        if (sort === "id") {
          return String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
        }
        const leftDate = dateValue(left.flight_date);
        const rightDate = dateValue(right.flight_date);
        if (leftDate == null && rightDate == null) {
          return String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
        }
        if (leftDate == null) return 1;
        if (rightDate == null) return -1;
        if (leftDate === rightDate) {
          return String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
        }
        return sort === "newest" ? rightDate - leftDate : leftDate - rightDate;
      });
  }, [availability, detectionCounts, query, sort, surveys]);

  const hasFilters = query.trim().length > 0 || availability !== "all" || sort !== "newest";
  const resetFilters = () => {
    setAvailability("all");
    setQuery("");
    setSort("newest");
  };
  const handleViewKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextView: ExplorerView | null = null;
    if (event.key === "ArrowLeft" || event.key === "Home") {
      nextView = "list";
    } else if (event.key === "ArrowRight" || event.key === "End") {
      nextView = "map";
    }
    if (!nextView) return;

    event.preventDefault();
    setView(nextView);
    requestAnimationFrame(() => {
      document.getElementById("survey-" + nextView + "-tab")?.focus();
    });
  };

  if (surveys.length === 0) {
    return (
      <Card id="survey-explorer">
        <CardHeader>
          <CardTitle>Survey Explorer</CardTitle>
          <CardDescription>Your accessible survey maps and outputs appear here.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-72 items-center justify-center">
          <div className="max-w-md text-center">
            <MapIcon className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-4 font-semibold">No surveys available</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This account does not currently have access to any surveys. Contact your
              administrator if you expected survey access.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const results = (
    <div className="space-y-3">
      {visibleSurveys.map((survey) => (
        <SurveyResultCard
          detectionCount={detectionCounts.get(String(survey.id)) ?? 0}
          key={survey.id}
          orthomapHrefBase={orthomapHrefBase}
          survey={survey}
          surveyHrefBase={surveyHrefBase}
        />
      ))}
    </div>
  );

  const noResults = (
    <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed p-6">
      <div className="max-w-sm text-center">
        <SearchIcon className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <h3 className="mt-3 font-semibold">No matching surveys</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try another search or clear the current availability filter.
        </p>
        <Button className="mt-4" variant="outline" onClick={resetFilters}>
          <RotateCcwIcon className="size-4" aria-hidden="true" />
          Reset filters
        </Button>
      </div>
    </div>
  );

  const map = (
    <div className="h-[30rem] overflow-hidden rounded-xl border lg:h-[38rem]">
      <DashboardMapCaller data={visibleSurveys} surveyHrefBase={surveyHrefBase} />
    </div>
  );

  return (
    <Card id="survey-explorer" className="scroll-mt-20">
      <CardHeader className="gap-4">
        <div>
          <CardTitle>Survey Explorer</CardTitle>
          <CardDescription>Search and review every survey available to this account.</CardDescription>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_11rem_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="survey-search">Search surveys</Label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="survey-search"
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ID, location, or area code"
                value={query}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="survey-availability">Available data</Label>
            <Select value={availability} onValueChange={(value) => setAvailability(value as AvailabilityFilter)}>
              <SelectTrigger id="survey-availability" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All surveys</SelectItem>
                <SelectItem value="orthomosaic">Orthomosaic</SelectItem>
                <SelectItem value="point_cloud">3D data</SelectItem>
                <SelectItem value="detections">Detections</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="survey-sort">Sort by</Label>
            <Select value={sort} onValueChange={(value) => setSort(value as SurveySort)}>
              <SelectTrigger id="survey-sort" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="id">Survey ID</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!hasFilters} onClick={resetFilters} variant="outline">
            <RotateCcwIcon className="size-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
          Showing {visibleSurveys.length} of {surveys.length} surveys
        </p>
      </CardHeader>
      <CardContent>
        {visibleSurveys.length === 0 ? noResults : (
          <>
            <div className="mb-3 grid grid-cols-2 rounded-lg bg-muted p-1 lg:hidden" role="tablist" aria-label="Survey explorer view">
              <Button
                aria-controls="survey-list-panel"
                aria-selected={view === "list"}
                className="min-h-10"
                id="survey-list-tab"
                onClick={() => setView("list")}
                role="tab"
                variant={view === "list" ? "secondary" : "ghost"}
                onKeyDown={handleViewKeyDown}
                tabIndex={view === "list" ? 0 : -1}
              >
                <ListIcon aria-hidden="true" />List
              </Button>
              <Button
                aria-controls="survey-map-panel"
                aria-selected={view === "map"}
                className="min-h-10"
                id="survey-map-tab"
                onClick={() => setView("map")}
                role="tab"
                variant={view === "map" ? "secondary" : "ghost"}
                onKeyDown={handleViewKeyDown}
                tabIndex={view === "map" ? 0 : -1}
              >
                <MapIcon aria-hidden="true" />Map
              </Button>
            </div>
            <div className="relative gap-4 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
              <div
                className={view === "map" ? "relative block" : "invisible absolute inset-x-0 top-0 lg:visible lg:static lg:block"}
                id="survey-map-panel"
                aria-labelledby="survey-map-tab"
                role="tabpanel"
              >
                {map}
              </div>
              <div
                className={(view === "list" ? "relative block" : "invisible absolute inset-x-0 top-0 lg:visible lg:static lg:block") + " max-h-[38rem] overflow-y-auto pr-1"}
                id="survey-list-panel"
                aria-labelledby="survey-list-tab"
                role="tabpanel"
              >
                {results}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
