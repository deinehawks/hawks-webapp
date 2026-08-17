# Session Handoff

Last updated: 2026-08-17

The dedicated Users & Access wave now includes account list/detail, read-only effective-access preview, survey/farm grant controls, membership controls, repaired pgTAP coverage, read-only resource list routes, Organization Operations v1, Farm Operations v1, and Survey Operations v1. `/admin/users` lists existing accounts and summarizes organization/resource access. `/admin/users/[id]` owns membership plus survey/farm grant workflows. `/admin/access-preview/[profileId]` calculates effective survey/farm access without impersonation. `/admin/[resource]` lists clients, organizations, people, farms, surveys, memberships, and outputs. `/admin/organizations/new` creates canonical organizations, and `/admin/organizations/[id]` edits organization metadata/status, shows roster, and adds existing users as viewer/editor members. `/admin/farms/new` creates canonical farms, and `/admin/farms/[id]` edits farm metadata/status, links active organizations, and shows organization/survey relationships. `/admin/surveys/[id]` edits workshop-safe survey metadata/status, links active farms/organizations, and shows output readiness without mutating asset paths.

Controlled mutations are limited to viewer/editor membership creation/role/status changes, survey/farm grant create/revoke/reactivate transitions, organization create/edit/active-inactive status changes, farm create/edit/active-inactive status changes, confirmed farm-organization link creation, survey metadata/status updates, confirmed survey-organization links, and survey-farm links. They re-authenticate the actor, require `platform_admin`, preserve records, rely on existing RLS, reject unsupported transitions, and use existing row audit triggers. No code path changes `profiles.role`; account roles remain only `platform_admin | user`, while `org_admin | editor | viewer` belong to memberships.

Validation:

- TypeScript passes.
- Targeted lint passes with no findings; repository-wide lint still fails on the pre-existing `components/maplibre.tsx` ban-ts-comment error.
- Focused domain pgTAP passes 43/43.
- Full pgTAP suite passes 74 tests across 4 files after stale fixture repair.
- User smoke confirmed platform-admin access and normal-user denial for `/admin` before this slice.
- Authenticated visual smoke for `/admin/access-preview/[profileId]`, farm-grant controls, and `/admin/[resource]` list routes remains manual.

Next task: smoke Survey Operations v1, then implement output/workshop readiness controls as the next domain/workshop slice.

Do not touch unrelated scratch work in `.tmp/`, `issues.txt`, `workflow.txt`, or the user-owned deletion of `improve.txt`.