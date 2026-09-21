# Dashboard Overview and Survey Explorer Page Split

Date: 2026-09-18
Status: Approved plan; implementation pending

## Summary

Keep the main user Dashboard as a general overview and move the completed
survey-focused experience to the existing survey index route. Continue the
work on `feature/dashboard-survey-explorer`; no new branch is required.

Canonical routes:

- General Dashboard: `/dashboard`
- Survey Explorer: `/dashboard/surveys`
- Survey detail: `/dashboard/surveys/[surveyId]`
- Preview Dashboard: `/user-app-preview/[profileId]`
- Preview Survey Explorer: `/user-app-preview/[profileId]/surveys`

## Main Dashboard

- Restore the original cards, overview map, and full paginated survey-table
  composition as the account-wide landing page.
- Keep the Analysis/Inventory summary mode while correcting null handling,
  date calculations, percentages, and output-readiness labels.
- Show every authorized survey. Missing values display as `Not available`, and
  surveys without boundaries remain in the table while being excluded from map
  geometry.
- Retain useful search, filtering, sorting, pagination, column visibility, and
  real navigation into survey details.
- Add a clear action that opens Survey Explorer.
- Do not restore misleading row-selection or mutation behavior. Edit, Copy,
  Favorite, and Delete require separate authorization and lifecycle designs.

## Dedicated Survey Explorer

- Move the current survey-focused header, summary cards, search, availability
  filters, sorting, responsive map/results layout, and empty states to
  `/dashboard/surveys`.
- Preserve local-only filter state, exact map/result parity, a single MapLibre
  instance, UTC dates, incomplete-record handling, and keyboard-accessible
  mobile Map/List tabs.
- Add the equivalent target-scoped page under User App Preview using the
  existing preview data calculation and preview-specific link bases.
- Add route-specific loading skeletons for the general Dashboard and Survey
  Explorer.

## Sidebar and Compatibility

- Add primary Dashboard and Survey Explorer links to both normal and preview
  sidebars.
- Keep the Orthomap section and five newest survey shortcuts.
- Point `View all surveys` to the dedicated Survey Explorer route instead of a
  Dashboard hash.
- Preserve existing survey-detail and Orthomap routes, server loaders, RLS,
  protected-asset behavior, and User App Preview scope.
- Add no database queries, schema changes, URL filter parameters, storage
  changes, or authorization changes.

## Validation

- Run Next route type generation, TypeScript, targeted ESLint,
  `git diff --check`, and workshop regression 18/18.
- Smoke-test zero, one, many, and incomplete surveys on both Dashboard and
  Survey Explorer.
- Verify summary calculations, UTC ordering, table controls, map geometry,
  filters, map/list parity, mobile tabs, sidebar active states, and all normal
  and preview link destinations.
- Verify anonymous redirects, target-scoped preview access, keyboard/focus
  behavior, responsive layouts, clean console output, and absence of duplicate
  map or tile requests.

## Deferred Work

- Survey Edit, Copy, Favorite, Delete, and destructive asset operations.
- Farm-first navigation, multi-client selection, automatic farm-to-survey
  inheritance, and Survey Request workflows.
- MinIO relocation, Wave 3 migration, and real-data Orthomap date-filter smoke.
