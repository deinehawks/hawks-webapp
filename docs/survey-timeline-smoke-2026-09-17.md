# Survey Timeline Smoke Evidence

Date: 2026-09-17

Status: passed through user-assisted application smoke on
`feature/survey-timeline`.

Historical scope note (2026-09-21): this evidence covers the original
primary-farm grouping behavior. The later
`refactor/survey-timeline-area-key` change groups by the exact raw
`surveys.code` and `surveys.area_code` pair instead. That grouping change
requires its own focused smoke before integration.

## Area-Key Refactor Partial Smoke

Date: 2026-09-22

Status: partial pass on `refactor/survey-timeline-area-key`.

The user confirmed that the available normal and User App Preview routes,
responsive timeline controls, keyboard interaction, authorization boundaries,
and browser console/network behavior passed. The current dataset does not yet
contain representative records for the new grouping contract, so the following
cases are deferred until after data migration:

- the same raw `surveys.code + surveys.area_code` pair across different
  flight dates;
- distinct survey IDs sharing the same pair and flight date;
- exclusion of same-code/different-area, same-area/different-code, and
  farm-only matches; and
- missing code, area code, or flight date plus output-unavailable states.

These cases are unverified, not failed. Do not treat the area-key grouping as
fully smoke-validated until representative migrated data exercises them.

## Scope

The smoke covered the normal survey route and User App Preview with
representative primary-farm relationships and dated surveys. The user reported
that all checklist cases passed, including:

- desktop timeline hierarchy, ordering, current state, availability indicators,
  horizontal scrolling, and survey navigation;
- mobile date selection, current-survey summary, responsive layout, and
  current-only behavior;
- missing-primary-farm, missing-flight-date, current-only, and multi-survey
  ready states;
- viewer reset to Orthomosaic when switching surveys;
- ordinary-user scope, denied survey access, anonymous redirect, and
  selected-user scope in User App Preview;
- keyboard focus and navigation behavior; and
- clean browser console and expected network behavior during navigation.

## Automated Baseline

The post-refinement branch already passed Next route type generation,
TypeScript, targeted ESLint, authored-file whitespace checks, workshop
regression 18/18, and anonymous NGINX redirect smoke.

## Boundary

This is user-assisted feature smoke evidence, not proof of a staging or
production data rollout. No staging relationship assignment, schema change,
RLS change, route change, asset migration, Wave 3 action, or production action
is authorized by this result. Any future staging relationship changes retain a
separate reviewed backup, rollback, and approval gate.

## Result

The Survey Timeline feature is ready for focused branch review and normal
integration, subject to the branch diff and validation checks remaining clean.
