"use client";

import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type OrthomapDateOption = {
  value: string;
  label: string;
  count: number;
};

const ALL_DATES_VALUE = "all";

function orthomosaicCountLabel(count: number): string {
  return `${count} ${count === 1 ? "orthomosaic" : "orthomosaics"}`;
}

export function OrthomapSurveyDateFilter({
  onValueChange,
  options,
  totalCount,
  value,
}: {
  onValueChange: (value: string) => void;
  options: OrthomapDateOption[];
  totalCount: number;
  value: string;
}) {
  if (options.length === 0) return null;

  const selectedOption = options.find((option) => option.value === value);
  const selectedSummary = selectedOption
    ? `${selectedOption.label}, ${orthomosaicCountLabel(selectedOption.count)}`
    : `All dates, ${orthomosaicCountLabel(totalCount)}`;

  if (options.length === 1) {
    const option = options[0];

    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/25 px-3.5 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CalendarDays className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            Survey date
          </p>
          <p className="truncate text-sm font-semibold">
            {option.label} · {orthomosaicCountLabel(option.count)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="@3xl/card:hidden">
        <Label
          className="mb-2 block text-xs font-medium text-muted-foreground"
          htmlFor="orthomap-survey-date"
        >
          Survey date
        </Label>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger
            id="orthomap-survey-date"
            className="h-10 w-full bg-background"
          >
            <SelectValue placeholder="Select a survey date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DATES_VALUE}>
              All dates — {orthomosaicCountLabel(totalCount)}
            </SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} — {orthomosaicCountLabel(option.count)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav
        aria-label="Survey dates"
        className="@3xl/card:flex hidden snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
      >
        <Button
          aria-pressed={value === ALL_DATES_VALUE}
          className="h-auto min-w-36 shrink-0 snap-start flex-col items-start gap-0.5 px-3 py-2"
          onClick={() => onValueChange(ALL_DATES_VALUE)}
          type="button"
          variant={value === ALL_DATES_VALUE ? "default" : "outline"}
        >
          <span>All dates</span>
          <span
            className={cn(
              "text-xs font-normal",
              value === ALL_DATES_VALUE
                ? "text-primary-foreground/75"
                : "text-muted-foreground",
            )}
          >
            {orthomosaicCountLabel(totalCount)}
          </span>
        </Button>

        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <Button
              key={option.value}
              aria-pressed={isSelected}
              className="h-auto min-w-40 shrink-0 snap-start flex-col items-start gap-0.5 px-3 py-2"
              onClick={() => onValueChange(option.value)}
              type="button"
              variant={isSelected ? "default" : "outline"}
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  "text-xs font-normal",
                  isSelected
                    ? "text-primary-foreground/75"
                    : "text-muted-foreground",
                )}
              >
                {orthomosaicCountLabel(option.count)}
              </span>
            </Button>
          );
        })}
      </nav>

      <p aria-live="polite" className="sr-only">
        Showing {selectedSummary}.
      </p>
    </div>
  );
}
