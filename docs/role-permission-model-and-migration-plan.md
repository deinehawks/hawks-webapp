# Role and Permission Model Migration Plan

Last updated: 2026-08-12
Status: Approved target design. Local/staging implementation has removed `profiles.account_role` and `profiles.organization_id`; individual-farmer access is handled through explicit resource grants.

## Purpose

This document defines the long-term source of truth for account, organization, and resource permissions before implementation begins. The goal is to remove duplicated role state, keep platform-admin authority clear, and migrate away from legacy single-organization compatibility without breaking current workshop workflows.

## Target Model

### Account-level source of truth

`profiles.role` is the only long-term account-level role column.

Approved target values:

- `platform_admin`: a trusted platform operator with cross-tenant admin authority through approved platform-admin routes, server actions, RLS policies, and audit-covered workflows.
- `user`: a normal authenticated account. A user receives application access through organization memberships and explicit resource grants, not through account-level role values.

Values such as `org_admin`, `editor`, `viewer`, `individual`, or `member` should not be final account-level role values. They describe organization/resource scope or older compatibility states and create ambiguity when stored beside `profiles.role`. The deployed schema now normalizes rows and enforces a check constraint so `profiles.role` stores only `platform_admin` or `user`; historical enum labels may remain visible until a later enum rebuild removes them.

### Organization-level source of truth

`organization_memberships.role` is the long-term organization-level role column.

Approved target values:

- `org_admin`: manages approved organization-scoped membership workflows. Platform-admin-only powers, platform role changes, organization-admin promotion, service-role Auth administration, cross-organization access, and destructive operations remain outside this role.
- `editor`: may perform approved organization-scoped edits once specific workflows are implemented and covered by RLS, server checks, tests, and audit where needed. Until then, it must not imply hidden write access.
- `viewer`: read-only organization-scoped access to approved surveys, maps, outputs, and reports.

Membership status remains separate from membership role. A suspended, removed, pending, or invited membership must not grant the same access as an active membership.

### Resource-specific exceptions

`survey_access_grants` and `farm_access_grants` remain resource-specific exceptions.

- A survey grant authorizes only the approved survey scope and related outputs covered by that grant.
- A farm grant authorizes only the approved farm record scope. It does not automatically reveal survey data or survey outputs.
- Grants must remain explicit, auditable where sensitive, and fail closed when inactive, expired, revoked, or mismatched.

### Transitional fields

- `profiles.account_role` is redundant with the approved account role model and should be removed after compatibility checks pass.
- `profiles.organization_id` is legacy compatibility for the current single-client tenant path. It should stay until organization membership and grant authorization prove parity end to end.

Do not rename `profiles.organization_id` to `default_organization_id` as a shortcut. The existing column points to the historical `clients` compatibility tenant, not necessarily a canonical organization.

## Role Responsibilities

| Layer | Role or field | Responsibility | Must not do |
| --- | --- | --- | --- |
| Platform | `profiles.role = platform_admin` | Platform admin route access, approved cross-tenant review, controlled admin mutations, audit review, manifest readiness/admin workflows. | Runtime service-role Auth administration, destructive operations, or storage/policy changes without separate approval. |
| Platform | `profiles.role = user` | Normal authenticated account identity. | Grant tenant, organization, survey, farm, or admin access by itself. |
| Organization | `organization_memberships.role = org_admin` | Approved organization-scoped membership and operational management. | Promote organization admins, change platform roles, access other organizations, bypass suspended/removed status, or manage Auth users. |
| Organization | `organization_memberships.role = editor` | Future approved organization-scoped edits. | Receive implicit write access before workflow-specific RLS/server/action approval. |
| Organization | `organization_memberships.role = viewer` | Read-only organization-scoped access. | Mutate organization, survey, farm, membership, or asset metadata. |
| Resource | `survey_access_grants` | Explicit survey exception. | Grant unrelated farm or organization access. |
| Resource | `farm_access_grants` | Explicit farm exception. | Grant survey/output access without a separate survey grant. |

## Current Overlap And Ambiguity

The current implementation has several compatibility layers that are useful during expansion but confusing as long-term role design:

- `profiles.role` currently carries account-like and access-like values. Historical values such as `viewer`, `editor`, and `org_admin` blur account and organization scope.
- `profiles.account_role` duplicates platform role intent and includes `platform_admin`, which makes admins ask whether it is the same authority as `profiles.role`.
- `organization_memberships.role` currently uses ordinary `member` in implemented admin workflows, but that label does not distinguish read-only, edit, and organization-admin responsibilities.
- `profiles.organization_id` points to the legacy `clients` tenant path. It is currently important for app and RLS compatibility, but it is not the long-term organization-access source of truth.
- `clients` remains a mixed historical tenant table. A client row can represent a cooperative, association, organization, individual, or unresolved legacy tenant, so it should not become the permanent organization model.
- Existing RLS helpers and tests mix legacy tenant checks, platform role checks, membership checks, and explicit grants while the expand phase is still in progress.

## `profiles.account_role` Dependency Inventory

Known dependency areas to remove or update before dropping `profiles.account_role`:

- Application code: platform-admin admin routes and membership actions that select, display, filter, or check `account_role`.
- RLS and SQL helpers: the additive domain foundation created `app_private.domain_account_role()` and platform-admin helpers that currently consult `account_role` as compatibility.
- Verification SQL: domain verification scripts check `account_role` for platform-admin approval conditions.
- pgTAP tests: domain authorization, protected asset authorization, and workshop manifest gate tests include `account_role` setup or assertions.
- Migrations: checked-in migrations create the enum/column/index/helper references. These must remain historical evidence, but follow-up migrations must remove active database dependence safely.
- Generated types: `lib/database.types.ts` exposes the enum and column until types are regenerated from an approved migrated schema.
- Admin workflows: current UI/read models may surface account role values for operator context and must be switched to `profiles.role` semantics.

### Safe `account_role` migration phases

1. Stop new feature work from reading or writing `profiles.account_role`.
2. Update application platform-admin checks to use `profiles.role` only, preserving existing route protections and RLS reliance.
3. Update RLS helpers/functions so platform-admin checks source from `profiles.role` only.
4. Update verification SQL and pgTAP fixtures/assertions to remove `account_role` dependence.
5. Regenerate generated database types after the approved schema migration is applied in the target environment.
6. Prove platform-admin allow cases and normal-user deny cases through app checks, direct SQL/RLS tests, and admin workflow smoke tests.
7. Drop the `account_role` column, enum, indexes, helper functions, and compatibility logic only when no active code, SQL, tests, docs used as runbooks, or generated types depend on them.

### `account_role` drop gates

It is unsafe to drop `profiles.account_role` until all of these are true:

- `rg account_role` has no active application, RLS, test, verification, or generated-type references except historical migrations and archived notes.
- Platform-admin route access still works for `profiles.role = 'platform_admin'`.
- Non-platform accounts with `profiles.role = 'user'` are denied platform-admin routes and platform-admin RPC/server-action paths.
- Existing approved admin mutations still write expected audit rows.
- Local migration rehearsal and non-production staging migration pass rollback and verification checks.
- Generated types are regenerated by the approved generator and the diff is reviewed.

## `profiles.organization_id` Dependency Inventory

Known dependency areas to preserve until parity is proven:

- `lib/auth/user-context.ts` uses `profiles.organization_id` to build authenticated tenant context.
- Client and survey server actions authorize compatible reads through `profiles.organization_id` and `surveys.client_id`.
- Legacy RLS helpers such as current organization and survey organization checks rely on this UUID tenant path.
- Protected asset authorization currently supports legacy organization/client access plus membership/grant paths.
- Deferred contract/storage SQL still references the compatibility model and must not be applied unchanged.
- pgTAP and verification tests cover legacy viewer/editor compatibility and protected asset behavior.
- Admin detail pages expose legacy profile organization identity for readiness review.
- The foreign key currently references `clients(id)`, not canonical `organizations(id)`.

### Long-term organization access source of truth

Organization access should come from active `organization_memberships` and explicit survey/farm grants. `profiles.organization_id` should remain a temporary compatibility fallback only while current app routes, RLS policies, protected assets, and workshop datasets are migrated.

Users with multiple memberships, no active membership, suspended memberships, or explicit grants must be handled explicitly:

- Multiple memberships are deferred for normal accounts in v1. The model should not accidentally grant cross-organization access before the UI and RLS support it.
- Users with no active membership may still sign in, but they should not receive tenant data unless an explicit resource grant allows it.
- Suspended or removed memberships must fail closed.
- Explicit survey grants can authorize survey access without creating broad organization access.
- Explicit farm grants do not authorize survey/output access.

### Safe `organization_id` migration phases

1. Inventory every active read, action, RLS policy, helper, test, and verification query using `profiles.organization_id`.
2. Confirm canonical client-to-organization mappings for the workshop scope.
3. Backfill `organization_memberships` from `profiles.organization_id` only where the legacy client has one approved canonical organization mapping.
4. Record exceptions for unassigned accounts, mixed/unclassified clients, suspended memberships, and accounts that should receive explicit survey grants instead of organization membership.
5. Cut app and RLS authorization to membership/grant checks while retaining a temporary legacy fallback.
6. Run parity checks comparing legacy access and membership/grant access for representative platform admin, organization admin, editor, viewer, suspended/removed, unassigned, cross-organization, farm-grant, and survey-grant cases.
7. Remove the legacy fallback only after app, direct RLS, protected asset, and smoke tests pass without it.
8. Drop `profiles.organization_id` only in a later contract migration after all active references and compatibility requirements are gone.

### `organization_id` drop gates

It is unsafe to drop `profiles.organization_id` while any of these are true:

- `lib/auth/user-context.ts`, survey/client actions, RLS helpers, protected asset RPCs, tests, or verification scripts still depend on it.
- Any workshop account lacks a proven active membership or explicit grant replacement.
- Any legacy `clients` row assigned to a profile lacks exactly one approved canonical organization mapping, unless that profile is intentionally unassigned.
- Protected tiles, point clouds, detections, maps, and survey routes have not passed parity checks without legacy fallback.
- The application still needs legacy `surveys.client_id` and route compatibility for workshop datasets.

## Required Migration Order After This Documentation Step

1. Remove app/RLS/test dependence on `profiles.account_role`.
2. Drop `profiles.account_role` only after no active code, SQL, tests, verification, or generated types depend on it.
3. Expand `organization_memberships.role` from `member` to `viewer`, `editor`, and `org_admin`.
4. Backfill memberships from `profiles.organization_id` using approved canonical organization mappings.
5. Normalize non-platform `profiles.role` values to `user`.
6. Cut app/RLS authorization to memberships and grants with a temporary legacy fallback.
7. Remove `profiles.organization_id` only after parity checks and smoke tests pass without fallback.

## Verification Queries And Acceptance Conditions

Run these only against a confirmed non-production target or local fixture unless separately approved.

```sql
-- Current account role overlap before migration.
select role, account_role, count(*) as profiles
from public.profiles
group by role, account_role
order by role, account_role;

-- Profiles assigned through the legacy client pointer but lacking an active membership.
select profile.id, profile.email, profile.organization_id
from public.profiles profile
where profile.organization_id is not null
  and not exists (
    select 1
    from public.client_organizations mapping
    join public.organization_memberships membership
      on membership.organization_id = mapping.organization_id
    where mapping.client_id = profile.organization_id
      and membership.profile_id = profile.id
      and membership.status = 'active'
  )
order by profile.email nulls last, profile.id;

-- Legacy client assignments without exactly one confirmed canonical organization mapping.
select profile.organization_id, count(*) as assigned_profiles
from public.profiles profile
where profile.organization_id is not null
  and not exists (
    select 1
    from public.client_organizations mapping
    where mapping.client_id = profile.organization_id
    group by mapping.client_id
    having count(distinct mapping.organization_id) = 1
  )
group by profile.organization_id
order by assigned_profiles desc;

-- Normal profiles with more than one live membership in the v1 model.
select profile_id, count(*) as live_memberships
from public.organization_memberships
where status in ('invited', 'pending', 'active', 'suspended')
group by profile_id
having count(*) > 1
order by live_memberships desc;
```

Acceptance conditions before implementation moves past each gate:

- Account-level platform admin authority is sourced from `profiles.role` only.
- Organization-level authority is sourced from active `organization_memberships` only.
- Resource exceptions are sourced from active explicit grants only.
- Suspended, removed, expired, unassigned, cross-organization, and anonymous cases fail closed.
- Existing workshop admin workflows keep their current behavior until a specific migration slice changes them with tests and rollback notes.
- No full `old_data` or `new_data` audit payloads are exposed in admin UI while testing role changes.

## Enum Cleanup Note

`public.app_role` still contains historical enum labels (`org_admin`, `editor`, and `viewer`) because PostgreSQL cannot simply delete enum values in place. The current safety boundary is a validated `profiles_role_account_scope_check` constraint that prevents those labels from being stored in `profiles.role`.

A later enum cleanup can rebuild `public.app_role` to contain only `platform_admin` and `user`, but it should be handled as a separate migration with dependency inspection, local reset, generated-type regeneration, staging apply, and app smoke validation.

## Documentation And Change-Control Rules

This document is the source of truth for the role model until superseded by a later dated decision. Implementation must happen in small reviewed slices. Each slice should update the relevant runbook, verification SQL/tests, generated types if needed, and compressed project state after validation.

Do not apply Supabase migrations, remote mutations, service-role operations, destructive cleanup, or generated-type rewrites as part of documentation-only updates.
