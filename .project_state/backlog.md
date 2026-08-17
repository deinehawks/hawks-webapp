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

## P1

- Smoke `/admin/access-preview/[profileId]` and farm-grant controls with a platform-admin session.
- Confirm normal-user denial remains intact for `/admin`, `/admin/users`, and `/admin/access-preview/*`.
- Smoke Organization Operations v1 and `/admin/[resource]` list routes.
- Implement Farm Operations and Survey Operations after organization smoke is confirmed.
- Continue approved workshop asset migration waves and protected-asset smoke coverage.

## P2

- Expand admin navigation for organizations, people, farms, surveys, outputs, and audit views.
- Rebuild `public.app_role` to remove historical enum labels after isolated dependency and migration validation.
- Decide whether compatibility stubs such as `app_private.current_organization_id()` can be removed before production.
- Migrate lint from deprecated `next lint` to the ESLint CLI.
- Investigate build heap exhaustion and document the accepted build command or memory setting.
- Containerize Next.js with standalone output and an asset-safe `.dockerignore`.

## P3

- Auth-user creation and invitation delivery.
- Platform-admin promotion/demotion and true impersonation.
- General multi-organization account workflows.
- Hard deletion, broad bulk mutation, and broad infrastructure administration.
- Full historical dataset migration, advanced analytics, DAM, and broad automation.