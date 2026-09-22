# Survey Timeline Smoke Evidence

Date: 2026-09-17

Status: passed through user-assisted application smoke on
`feature/survey-timeline`.

Historical scope note (2026-09-21): this evidence covers the original
primary-farm grouping behavior. The later
`refactor/survey-timeline-area-key` change groups by the exact raw
`surveys.code` and `surveys.area_code` pair instead. That grouping change
requires its own focused smoke before integration.

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
