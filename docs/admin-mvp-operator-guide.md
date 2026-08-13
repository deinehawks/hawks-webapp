# Admin MVP Operator Guide

Last updated: 2026-08-13
Status: Transitional current-state guide

This guide describes only the currently implemented Admin MVP under `/dashboard/admin`. The approved dedicated `/admin` architecture and delivery order are defined in `docs/admin-dashboard-integration-plan.md`. Until that cutover is implemented, this guide remains the operator reference for existing workflows; it does not define the final admin scope or navigation.

## Access

Platform admins can open `/dashboard/admin` from the dashboard sidebar. Non-platform users should be redirected away from admin routes.

Admin authorization still depends on server-side checks and Supabase RLS. UI visibility is only presentation.

The current role model is documented in `docs/role-permission-model-and-migration-plan.md`. `profiles.role` contains only `platform_admin` or `user`; organization authority comes from membership roles.

## What Platform Admins Can Do

Use the admin overview to review readiness counts, recent admin activity, and short domain lists for legacy clients, user accounts, surveys, organizations, people, farms, memberships, and outputs.

Use legacy client detail pages to classify mixed historical client records as:

- `unclassified`
- `organization`
- `individual`
- `other`

Use client mapping controls to connect a reviewed legacy client to one canonical record:

- an existing or newly created organization; or
- an existing or newly created person.

Use the overview membership form to create `viewer` or `editor` memberships for an existing user account and an existing active organization. The app should reject users that already have a live membership.

Use the overview survey-grant form for individual farmers or other narrow exceptions that should see one specific survey without organization membership. The target user and survey must already exist. This does not create organization access, farm access, role changes, or broad client access.

Use membership detail pages to update viewer or editor status only through allowed transitions:

- `invited` to `pending` or `removed`
- `pending` to `active` or `removed`
- `active` to `suspended` or `removed`
- `suspended` to `active` or `removed`

Removed memberships are retained for audit history and are not reactivated in this MVP.

## Currently Read-Only Areas

Profiles, organizations, people, farms, surveys, and outputs are currently visible for review, but most fields have no implemented mutation workflow yet. The dedicated admin plan will add approved audited operations incrementally, starting with Users & Access.

The Recent Admin Activity list is read-only and shows compact audit context for controlled writes. Use it with readiness signals to confirm that controlled changes were recorded and that records are ready for workshop use.

## Intentionally Blocked

These workflows remain deferred or manual:

- Auth-user creation and invitation delivery
- organization-admin promotion
- destructive deletes
- moving users across organizations
- broad farm and grant management beyond the narrow survey-grant creation workflow
- asset migration controls
- output and report publishing
- service-role operations from app runtime

Keep service-role credentials local/admin-only. Do not add them to browser code, deployment jobs, logs, or generated artifacts.

## Operator Checklist

Before a workshop user relies on an admin-managed organization:

1. Confirm the legacy client is classified.
2. Confirm it has exactly one intended canonical person or organization mapping.
3. Confirm the user profile already exists.
4. Create or verify one viewer or editor organization membership.
5. Set the membership to `active` only when access is approved.
6. Check readiness signals and the Recent Admin Activity list after each controlled mutation.
7. Smoke the user login and tenant access through the app.

## Approved Next Direction

The next admin release moves platform admins to a separate `/admin` layout and prioritizes existing-account membership, grant, and effective-access management. Access preview is read-only and keeps the authenticated actor as the platform admin. True impersonation, Auth-user invitations, platform-admin role changes, hard deletion, and broad infrastructure administration remain deferred.
