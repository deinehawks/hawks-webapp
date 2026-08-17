# Backlog

Last updated: 2026-08-17

## Completed In Current Admin Wave

- Dedicated `/admin` shell and role-based landing.
- Existing-account Users & Access list/detail workflow.
- Viewer/editor membership creation, role changes, and status transitions.
- Survey-grant creation, revocation, and reactivation with audit coverage.
- Read-only effective-access preview without session impersonation.
- Farm-grant creation, revocation, and reactivation with audit coverage.
- Stale pgTAP fixture repair for removed `organizations.slug` and `profiles.organization_id` fields.
- Read-only `/admin/[resource]` list route for clients, organizations, people, farms, surveys, memberships, and outputs.
- Organization Operations v1: organization create/edit/status, membership roster, and existing-user viewer/editor membership creation.
- Farm Operations v1: farm create/edit/status, confirmed organization links, and read-only survey relationship visibility.
- Survey Operations v1: survey metadata/status edit, active farm/organization links, and output readiness visibility.
- Output Operations v1: draft registration, safe metadata edits, storage-reference attachment, readiness transitions, storage-reference gates, and atomic current-output selection.

## P1

- Smoke `/admin/access-preview/[profileId]` and farm-grant controls with a platform-admin session.
- Confirm normal-user denial remains intact for `/admin`, `/admin/users`, and `/admin/access-preview/*`.
- Smoke Organization Operations v1 and `/admin/[resource]` list routes.
- Smoke Farm Operations v1.
- Smoke Survey Operations v1.
- Smoke Output Operations v1, including draft creation, metadata edits, storage-reference attachment, readiness transitions, current selection, locked states, and normal-user denial.
- Continue approved workshop asset migration waves and protected-asset smoke coverage.

## P2

- Expand admin navigation for organizations, people, farms, surveys, outputs, and audit views.
- Define and approve output/report publication and rollback rules before enabling `published` transitions.
- Rebuild `public.app_role` to remove historical enum labels after isolated dependency and migration validation.
- Decide whether compatibility stubs such as `app_private.current_organization_id()` can be removed before production.
- Remove or replace the stale `app_private.backfill_legacy_organization_memberships` helper, which still references removed `profiles.organization_id` and causes local schema lint to fail.
- Migrate lint from deprecated `next lint` to the ESLint CLI.
- Investigate build heap exhaustion and document the accepted build command or memory setting.
- Containerize Next.js with standalone output and an asset-safe `.dockerignore`.

## P3

- Auth-user creation and invitation delivery.
- Platform-admin promotion/demotion and true impersonation.
- General multi-organization account workflows.
- Hard deletion, broad bulk mutation, and broad infrastructure administration.
- Full historical dataset migration, advanced analytics, DAM, and broad automation.