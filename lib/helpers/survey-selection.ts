export const ALL_SURVEYS = "all";

export type SurveyChoice = {
  id: string | number;
  code?: string | null;
  access_code?: string | null;
  area_code?: string | null;
  flight_date?: string | Date | null;
  area?: number | string | null;
};

export function sortSurveysById<T extends { id: string | number }>(surveys: readonly T[]): T[] {
  return [...surveys].sort((a, b) => {
    const left = String(a.id), right = String(b.id);
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

export function getSurveyChoices<T extends { id: string | number }>(
  features: readonly { properties?: { survey_id?: unknown } | null }[] | null | undefined,
  surveys: readonly T[],
): T[] {
  const hits = new Set((features ?? []).map((feature) => feature.properties?.survey_id)
    .filter((id) => typeof id === "string" || typeof id === "number").map(String));
  const seen = new Set<string>();
  return sortSurveysById(surveys).filter((survey) => {
    const id = String(survey.id);
    if (!hits.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function getSurveySelectionData<
  T extends { id: string | number },
  D extends { areaCode?: unknown },
>(surveys: readonly T[], detections: readonly D[], requestedId: string) {
  const ordered = sortSurveysById(surveys);
  const selection = ordered.length === 0 ? ""
    : requestedId === ALL_SURVEYS ? ALL_SURVEYS
    : ordered.some((survey) => String(survey.id) === requestedId) ? requestedId
    : String(ordered[0].id);
  const visibleSurveys = selection === ALL_SURVEYS ? ordered
    : ordered.filter((survey) => String(survey.id) === selection);
  const visibleIds = new Set(visibleSurveys.map((survey) => String(survey.id)));
  return {
    selection,
    surveys: visibleSurveys,
    detectedObjects: detections.filter((object) =>
      typeof object.areaCode === "string" && visibleIds.has(object.areaCode)),
  };
}

export function getSurveyLabel(survey: SurveyChoice): string {
  return [survey.access_code || survey.code, survey.area_code].filter(Boolean).join("-");
}

export function getSurveyTileUrl(survey: SurveyChoice & {
  tile_url?: string | null;
  ortho?: { tile_folder?: string | null } | null;
}): string | null {
  if (survey.tile_url) return survey.tile_url;
  if (!survey.code || !survey.flight_date || survey.ortho === null) return null;
  const date = new Date(survey.flight_date);
  if (!Number.isFinite(date.getTime())) return null;
  return `/asimov-hawks/tiles/${survey.code.toLowerCase()}/${date.getFullYear()}/${survey.id}/ortho/${survey.ortho?.tile_folder ?? "round-corners"}/{z}/{x}/{y}.png`;
}

type SurveyLayerMap = {
  getStyle: () => { layers?: readonly { id: string }[] } | undefined;
  getLayer: (id: string) => unknown;
  moveLayer: (id: string, beforeId?: string) => unknown;
};

/** Reestablish stacking after sources mount, without triggering repeated moves. */
export function orderSurveyLayers(map: SurveyLayerMap, rasterIds: readonly string[]): void {
  const layers = map.getStyle()?.layers ?? [];
  const ids = rasterIds.filter((id) => map.getLayer(id));
  const current = layers.filter((layer) => ids.includes(layer.id)).map((layer) => layer.id);
  const fillIndex = layers.findIndex((layer) => layer.id === "area-fills");
  if (fillIndex < 0) return;
  if (current.join("|") !== ids.join("|") ||
      layers.some((layer, index) => ids.includes(layer.id) && index > fillIndex)) {
    ids.forEach((id) => map.moveLayer(id, "area-fills"));
  }
  const overlays = ["boundary-glow", "boundary-borders", "area-labels"].filter((id) => map.getLayer(id));
  const updated = map.getStyle()?.layers ?? [];
  if (overlays.length && updated.slice(-overlays.length).map((layer) => layer.id).join("|") !== overlays.join("|")) {
    overlays.forEach((id) => map.moveLayer(id));
  }
}
