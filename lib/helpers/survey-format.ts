import { format, isValid, parseISO } from "date-fns";
import type { SurveyChoice } from "./survey-selection";

export function formatSurveyDate(value: SurveyChoice["flight_date"]): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? format(date, "dd MMM yyyy") : "—";
}

export function formatSurveyArea(value: SurveyChoice["area"]): string {
  if (value == null || (typeof value === "string" && !value.trim())) return "—";
  const area = Number(value);
  return Number.isFinite(area) && area >= 0
    ? area.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ha"
    : "—";
}
