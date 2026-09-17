# Orthomap Survey Date Filter Local Validation

Date: 2026-09-17

Branch: `feature/orthomap-date-filter`

## Implemented Scope

- Added a local, non-persisted All dates/date selection to the shared Orthomap.
- Included only surveys with a valid UTC flight date and current orthomosaic.
- Applied one visible survey set to raster, boundary, label, detection, FOI,
  popup, and map-event behavior on normal and User App Preview routes.
- Kept the MapLibre base style stable and moved survey boundary/label data into
  reactive child sources.
- Added zero-, one-, and multiple-date states, desktop scroll-snap controls,
  mobile Select, focus/pressed semantics, and live selection feedback.
- Preserved server-enforced scope, routes, props, TMS/asset paths, and the
  authoritative primary-farm Survey Timeline navigation.

No database, RLS, storage, route, asset, staging, or production mutation was
made.

## Automated Evidence

- `npx next typegen`: passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint for the modified map and new filter: zero errors. The map
  reports 17 existing warnings; the same file on the development baseline
  reports 36 warnings. The new filter reports no warnings.
- `npm run workshop-assets:test`: passed 18/18.
- `git diff --check`: passed; Git emitted only the existing line-ending
  conversion notice for the modified map file.
- Login endpoint through local NGINX/Next:
  `/asimov-hawks/auth/login` returned HTTP 200.
- Anonymous protected Orthomap request:
  `/asimov-hawks/dashboard/orthomap/test` returned HTTP 307 to
  `/asimov-hawks/auth/login`.

## Pending Authenticated Smoke

The current local dataset does not contain enough surveys with different
flight dates to exercise the multi-date filter meaningfully. The user therefore
deferred authenticated interaction and responsive visual validation until
representative data is available. Do not treat the automated checks as a
replacement for this manual smoke:

1. On a normal user client with at least two eligible dates, confirm All dates
   is the reload default and date choices are newest first with correct counts.
2. Select each date and return to All. Confirm raster tiles, boundaries, labels,
   detections, FOI counts/layers, survey popups, and map-click behavior contain
   only the visible survey IDs, including multiple surveys on one date.
3. Confirm every selection change clears open survey/plant popups, hover state,
   and stale loading state; verify no stale layers or repeated tile requests.
4. Confirm the camera fits visible boundaries with the expected padding and
   animation. Check a survey without boundaries uses finite min/max extents,
   and missing both retains the current camera.
5. Confirm one eligible date shows a static date/count summary and zero eligible
   orthomosaics shows the dedicated empty state without tile requests.
6. Check desktop horizontal scrolling/snap, tablet layout, mobile Select,
   keyboard navigation, focus visibility, and the live selection summary.
7. Repeat representative checks in User App Preview and confirm its date
   choices and map content never exceed the selected user's calculated scope.
8. Confirm inaccessible surveys stay absent, anonymous access redirects, popup
   navigation reaches the individual Survey page, and the console/network log
   remains clean.
