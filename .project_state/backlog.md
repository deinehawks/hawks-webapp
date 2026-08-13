# Backlog

Last updated: 2026-08-13

## P1

- Build Users & Access pages in `/admin` for existing profiles, memberships, survey/farm grants, status/role transitions, and access diagnosis.
- Add read-only effective-access preview using live membership/grant rules without session impersonation.
- Split legacy overview sections into dedicated admin resource routes and move the relevant controls out of the monolithic overview.
- Ensure every new admin mutation is authenticated, RLS-bound, transition-validated, and audited.
- Prove post-drop parity across admin reads, direct RLS checks, and protected assets.
- Continue approved workshop asset migration waves and representative protected-asset smoke coverage.

## P2

- Expand the dedicated admin shell with domain-focused navigation for organizations, people, farms, surveys, outputs, and audit views.
- Rebuild `public.app_role` to remove historical enum labels after dependency inspection and isolated migration validation.
- Decide whether compatibility stubs such as `app_private.current_organization_id()` can be removed before production.
- Investigate build heap exhaustion and document the accepted build command or memory setting.
- Containerize Next.js with standalone output and an asset-safe `.dockerignore`.

## P3

- Auth-user creation and invitation delivery.
- Platform-admin promotion/demotion and true impersonation.
- General multi-organization account workflows.
- Hard deletion, broad bulk mutation, and broad infrastructure administration.
- Full historical dataset migration, advanced analytics, DAM, and broad automation.
