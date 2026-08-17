# Backlog

Last updated: 2026-08-17

## Completed In Current Admin Wave

- Dedicated `/admin` shell and role-based landing.
- Existing-account Users & Access list/detail workflow.
- Viewer/editor membership creation, role changes, and status transitions.
- Survey-grant creation, revocation, and reactivation with audit coverage.

## P1

- Authenticated platform-admin and denied normal-user smoke for `/admin/users`.
- Add read-only effective-access preview using live membership/grant rules without session impersonation.
- Add audited farm-grant creation/revocation while preserving farm-only scope.
- Continue splitting the legacy overview into dedicated resource routes.
- Repair stale pgTAP fixtures that still reference removed `organizations.slug` and `profiles.organization_id` fields.
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