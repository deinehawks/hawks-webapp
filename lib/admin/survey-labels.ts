type SurveyLabelInput = {
  id: string;
  code?: string | null;
  location?: string | null;
  flight_date?: string | null;
  client_id?: string | null;
  client?: {
    code?: string | null;
    name?: string | null;
  } | null;
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function shortDate(value: string | null | undefined): string | null {
  const cleaned = clean(value);
  if (!cleaned) return null;

  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return cleaned.slice(0, 10);

  return date.toISOString().slice(0, 10);
}

export function formatAdminSurveyLabel(survey: SurveyLabelInput): string {
  const surveyCode = clean(survey.code);
  const location = clean(survey.location);
  const clientCode = clean(survey.client?.code) ?? clean(survey.client?.name) ?? clean(survey.client_id);
  const date = shortDate(survey.flight_date);
  const labelParts = [`Survey ${shortId(survey.id)}`, surveyCode ?? location, clientCode, date].filter(
    (part): part is string => Boolean(part),
  );
  const dedupedParts = labelParts.filter((part, index) => labelParts.indexOf(part) === index);

  return dedupedParts.join(" · ");
}
