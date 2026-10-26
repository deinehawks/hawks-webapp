import fs from "node:fs";
import path from "node:path";

export type WorkshopVisibility = {
  enabled: boolean;
  visibleSurveys: Record<string, string[]>;
  demoCountMultipliers?: Record<string, number>;
};

const hiddenPolicy: WorkshopVisibility = { enabled: true, visibleSurveys: {} };

function normalizeCode(code: string | null | undefined): string {
  const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
  // Recording mode masks BARBCO2026 as DEMO for presentation only. Visibility
  // and demo-count policy must still use the real workshop client identity.
  return normalized === "DEMO" ? "BARBCO2026" : normalized;
}

function normalizeId(id: string | number): string {
  return String(id).trim().toUpperCase();
}

export function parseWorkshopVisibility(value: unknown): WorkshopVisibility {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a workshop visibility configuration object.");
  }
  const input = value as Record<string, unknown>;
  if (typeof input.enabled !== "boolean" || !input.visibleSurveys ||
      typeof input.visibleSurveys !== "object" || Array.isArray(input.visibleSurveys)) {
    throw new Error("Workshop visibility needs enabled and a visibleSurveys object.");
  }
  const visibleSurveys: Record<string, string[]> = Object.create(null);
  for (const [code, ids] of Object.entries(input.visibleSurveys)) {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode || !Array.isArray(ids) ||
        ids.some((id) => typeof id !== "string" || !id.trim())) {
      throw new Error("Each client code must have an array of survey IDs.");
    }
    visibleSurveys[normalizedCode] = [...new Set([
      ...(visibleSurveys[normalizedCode] ?? []),
      ...ids.map(normalizeId),
    ])];
  }
  const demoCountMultipliers: Record<string, number> = Object.create(null);
  if (input.demoCountMultipliers !== undefined) {
    if (!input.demoCountMultipliers || typeof input.demoCountMultipliers !== "object" || Array.isArray(input.demoCountMultipliers)) {
      throw new Error("Workshop demoCountMultipliers must be an object.");
    }
    for (const [code, factor] of Object.entries(input.demoCountMultipliers)) {
      const normalizedCode = normalizeCode(code);
      if (!normalizedCode || typeof factor !== "number" || !Number.isFinite(factor) || factor < 1) {
        throw new Error("Each workshop demo count multiplier must be a finite number of at least 1.");
      }
      demoCountMultipliers[normalizedCode] = factor;
    }
  }
  return { enabled: input.enabled, visibleSurveys, demoCountMultipliers };
}

/** Serialize display-only factors for authorized, visible surveys, never records. */
export function getWorkshopDemoCountMultipliers(
  surveys: readonly { id: string | number; code?: string | null }[],
  policy = getWorkshopVisibility(),
): Record<string, number> {
  const factors: Record<string, number> = {};
  if (!policy.enabled) return factors;
  for (const survey of surveys) {
    const factor = policy.demoCountMultipliers?.[normalizeCode(survey.code)];
    if (factor && factor !== 1 && isWorkshopSurveyVisible(survey.code, survey.id, policy)) factors[String(survey.id)] = factor;
  }
  return factors;
}

/** Small local config only; cache parsed JSON until its metadata changes. */
export function createWorkshopVisibilityReader(
  filename: string,
  reportError: (message: string) => void = console.error,
): () => WorkshopVisibility {
  let stamp: string | undefined;
  let cached = hiddenPolicy;
  let warned = false;
  return () => {
    try {
      const stats = fs.statSync(filename);
      const nextStamp = `${stats.mtimeMs}-${stats.ctimeMs}-${stats.size}`;
      if (nextStamp !== stamp) {
        cached = parseWorkshopVisibility(JSON.parse(fs.readFileSync(filename, "utf8")));
        stamp = nextStamp;
      }
      warned = false;
      return cached;
    } catch {
      // A missing/broken allowlist must not accidentally expose all surveys.
      stamp = undefined;
      cached = hiddenPolicy;
      if (!warned) {
        reportError("Workshop visibility config is missing or invalid; surveys are hidden until it is fixed.");
        warned = true;
      }
      return cached;
    }
  };
}

export const getWorkshopVisibility = createWorkshopVisibilityReader(
  path.join(process.cwd(), "config", "workshop-visibility.json"),
);

export function isWorkshopSurveyVisible(
  clientCode: string | null | undefined,
  surveyId: string | number,
  policy = getWorkshopVisibility(),
): boolean {
  return !policy.enabled ||
    Boolean(policy.visibleSurveys[normalizeCode(clientCode)]?.includes(normalizeId(surveyId)));
}

export function isWorkshopSurveyIdVisible(
  surveyId: string | number,
  policy = getWorkshopVisibility(),
): boolean {
  return !policy.enabled ||
    Object.values(policy.visibleSurveys).some((ids) => ids.includes(normalizeId(surveyId)));
}

export function isWorkshopClientVisible(
  clientCode: string | null | undefined,
  policy = getWorkshopVisibility(),
): boolean {
  return !policy.enabled ||
    Boolean(policy.visibleSurveys[normalizeCode(clientCode)]?.length);
}

export function filterWorkshopSurveys<T extends { id: string | number; code?: string | null }>(
  surveys: T[],
  policy = getWorkshopVisibility(),
): T[] {
  return policy.enabled
    ? surveys.filter((survey) => isWorkshopSurveyVisible(survey.code, survey.id, policy))
    : surveys;
}

export function filterWorkshopClients<T extends { code?: string | null }>(
  clients: T[],
  policy = getWorkshopVisibility(),
): T[] {
  return policy.enabled
    ? clients.filter((client) => isWorkshopClientVisible(client.code, policy))
    : clients;
}

export function filterWorkshopDetectionObjects<T extends { areaCode?: unknown }>(
  objects: T[],
  clientCode: string,
  policy = getWorkshopVisibility(),
): T[] {
  return policy.enabled
    ? objects.filter((object) => typeof object?.areaCode === "string" &&
        isWorkshopSurveyVisible(clientCode, object.areaCode, policy))
    : objects;
}

/** Both file routes use [client, year, surveyId, ...filePath]. */
export function hiddenWorkshopAssetResponse(
  request: Request,
  segments: string[],
  policy = getWorkshopVisibility(),
): Response | null {
  if (!policy.enabled ||
      (segments.length >= 4 && isWorkshopSurveyVisible(segments[0], segments[2], policy))) {
    return null;
  }
  return new Response(request.method === "HEAD" ? null : "Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** Revalidate workshop assets so later allowlist edits take effect on new requests. */
export function applyWorkshopAssetCachePolicy(
  response: Response,
  policy = getWorkshopVisibility(),
): Response {
  if (policy.enabled && [200, 206, 304].includes(response.status)) {
    response.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  }
  return response;
}
