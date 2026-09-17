# Orthomap Survey Date Filter Plan

Date: 2026-09-17

Status: approved follow-up plan; not implemented.

Recommended branch: `feature/orthomap-date-filter`, created only after
`feature/survey-timeline` is integrated into `development`.

## Decision

Add a lightweight client-level **Survey dates** filter to Orthomap. Do not
reuse the primary-farm Survey Timeline component or change Orthomap into a
single-survey route.

The Survey Timeline answers how one primary farm changes across independently
identified surveys. Orthomap remains the accessible client-wide coverage view
and may show several surveys for one selected flight date.

## User Experience

- Preserve **All dates** as the default so existing behavior remains available.
- On wide layouts, show a horizontally scrollable, newest-first date strip with
  the count of visible orthomosaics per date.
- On narrow layouts, use a labeled Select control with the same choices.
- Hide the interactive filter when only one selectable date exists.
- Selecting a date filters raster layers, boundaries, labels, detections,
  popups, and map events to the same visible survey IDs.
- Refit the map to the visible surveys and clear stale survey or plant popups.
- Keep the existing survey popup/detail action as the entry point to the
  farm-scoped Survey Timeline.
- Do not count a survey as a selectable Orthomap layer when it lacks a usable
  current orthomosaic.

## Data And Authorization

- Use `surveys.flight_date`; do not add a processing-date field.
- Derive the filter only from surveys already returned by the protected route.
- Normal Orthomap remains limited by the signed-in user's RLS/effective access.
- User App Preview derives choices only from the selected user's calculated
  survey scope, not the platform admin's unrestricted scope.
- Filter detections by the selected visible survey IDs so data cannot remain
  visible after its survey layer is removed.
- No schema, RLS, storage, asset-path, or public-route change is required.

## Implementation Shape

1. Derive normalized selectable dates and an `all` default from the accessible
   Orthomap surveys.
2. Keep the selected date as presentation state inside the Orthomap client
   feature.
3. Derive `visibleSurveys`, `visibleSurveyIds`, and filtered detections.
4. Build sources, boundaries, labels, centers, bounds, events, and popups from
   the visible collection rather than the unfiltered collection.
5. Add the responsive shadcn date strip/Select above the map without copying
   the farm-scoped timeline's routing behavior.
6. Apply the same behavior to normal and User App Preview routes.

## Acceptance

- All dates preserves the current accessible overview.
- Date choices are unique, newest first, and show correct orthomosaic counts.
- Changing dates updates every map layer and detection consistently without a
  stale popup, stale tile, request loop, or console error.
- Map bounds update for the visible surveys.
- Normal and preview routes remain independently scoped and fail closed.
- Desktop, tablet, mobile, keyboard, loading, empty, single-date, and
  multi-date states pass smoke testing.

## Deferred

Before/after sliders, opacity comparison, playback, automatic animation,
processing-date history, historical detection versioning, trend analytics,
and side-by-side comparison remain outside the first slice.
