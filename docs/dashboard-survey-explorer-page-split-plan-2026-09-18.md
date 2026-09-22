# Analytics-First Dashboard and Survey Explorer Page Split

Date: 2026-09-18
Status: Implemented; primary signed-in UI smoke passed

## Summary

Keep the main user Dashboard focused on crop analytics and operational
readiness while the dedicated survey index owns survey discovery, results,
and mapping. Continue the work on `feature/dashboard-survey-explorer`; no new
branch is required.

Canonical routes:

- General Dashboard: `/dashboard`
- Survey Explorer: `/dashboard/surveys`
- Survey detail: `/dashboard/surveys/[surveyId]`
- Preview Dashboard: `/user-app-preview/[profileId]`
- Preview Survey Explorer: `/user-app-preview/[profileId]/surveys`

## Main Dashboard

- Remove the survey map, recent-survey list, and Analysis/Inventory toggle from
  Dashboard. Survey discovery and maps belong only to Survey Explorer.
- Default crop-health analytics to the newest accessible survey with
  classified detection data. Provide a local survey selector without
  persisting its value.
- Keep each health snapshot survey-scoped so repeated flights are not combined.
  Show flight date, classified detections, infected detections, infection rate,
  and a native healthy/infected composition bar.
- Show account-wide mission-status and Orthomosaic/3D/detection readiness.
- Rank up to five surveys with infected detections by count, rate, newest UTC
  flight date, and survey ID. Do not present this as a clinical severity score.
- Treat absent classified data as unavailable rather than zero-percent
  infection, and disclose that model detections require field verification.
- Use one client label, an `N clients` label, or no label as appropriate.

## Dedicated Survey Explorer

- Move the survey-focused search, availability filters, sorting, responsive
  map/results layout, and empty states to `/dashboard/surveys`. Do not repeat
  the Dashboard summary cards here.
- Preserve local-only filter state, exact map/result parity, a single MapLibre
  instance, UTC dates, incomplete-record handling, and keyboard-accessible
  mobile Results/Map tabs that open on Results.
- Show survey ID, flight date, location, area, status, available outputs, and
  detection count in each result.
- Selecting a result highlights its map boundary and fits the map to it without
  navigating. Selecting a map boundary highlights and reveals the matching
  result.
- Keep explicit View Survey and View Orthomap actions.
- Add the equivalent target-scoped page under User App Preview using the
  existing preview data calculation and preview-specific link bases.
- Add route-specific loading skeletons for the general Dashboard and Survey
  Explorer.

## Sidebar and Compatibility

- Add primary Dashboard and Surveys links to both normal and preview sidebars.
- Keep the Orthomap section as the distinct client-level visualization entry.
- Remove Homepage because `/` is already a role-aware redirect rather than a
  separate destination.
- Remove the entire Recent Surveys group because Survey Explorer is the
  authoritative newest-first survey browser.
- Preserve existing survey-detail and Orthomap routes, server loaders, RLS,
  protected-asset behavior, and User App Preview scope.
- Add no database queries, schema changes, URL filter parameters, storage
  changes, or authorization changes.

## Validation

- Run Next route type generation, TypeScript, targeted ESLint,
  `git diff --check`, and workshop regression 18/18.
- Smoke-test zero surveys, no detections, one and many detection-bearing
  surveys, missing dates, multiple clients, and incomplete records in normal
  and preview contexts.
- Verify exact-label classification, selector ordering, survey-scoped rates,
  readiness counts, attention ranking, Survey Explorer map/result behavior,
  sidebar active states, and all normal and preview link destinations.
- Verify anonymous redirects, target-scoped preview access, keyboard/focus
  behavior, responsive layouts, clean console output, and that Dashboard makes
  no map or tile requests.

### User-Assisted Smoke Result — 2026-09-22

Status: partial pass on `feature/dashboard-survey-explorer` at `5bd3d5bf`.

The user reported that checklist sections 1-5 and 7-12 passed, covering
startup/navigation, Dashboard structure, client badge behavior, survey
selection, selected-survey KPIs, account-wide readiness, infected-survey
ranking, Survey Explorer, User App Preview, responsive/accessibility behavior,
and browser console/network checks. This includes confirmation that Dashboard
made no map or tile requests and that the prior icon serialization error did
not recur.

Crop-health panel validation (checklist section 6) is blocked by the absence of
representative sample data. Treat its counts, segmented percentages,
zero-count layout, and location/area fallback cases as unverified rather than
failed. Re-run those cases after representative data migration before final
integration sign-off.

## Deferred Work

- Survey Edit, Copy, Favorite, Delete, and destructive asset operations.
- Farm-first navigation, multi-client selection, automatic farm-to-survey
  inheritance, and Survey Request workflows.
- MinIO relocation, Wave 3 migration, and real-data Orthomap date-filter smoke.
