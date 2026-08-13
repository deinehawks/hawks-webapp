# Role And Permission Model

Last updated: 2026-08-13
Status: Authoritative current permission model and completed migration history

## Purpose

This document is the source of truth for account, organization, and resource authorization. Admin routes and delivery order are defined in `docs/admin-dashboard-integration-plan.md`; operational database steps are defined in `docs/supabase-migration-runbook.md`.

The legacy migration is complete locally and in staging: `profiles.account_role` and `profiles.organization_id` have been removed. Historical dependency inventories and drop gates remain below as migration evidence, not active instructions.

## Current Sources Of Truth

### Account level

`profiles.role` is the only account-level role source.

- `platform_admin`: platform-wide administration through protected admin routes and audited operations.
- `user`: no platform authority; organization and resource access must come from memberships or explicit grants.

The deployed `profiles_role_account_scope_check` permits only these values. PostgreSQL `public.app_role` still contains historical `org_admin`, `editor`, and `viewer` labels, but those labels are not valid profile roles and cannot be stored in `profiles.role`.

### Organization level

`organization_memberships.role` is the organization-authority source.

- `org_admin`: organization-scoped administration allowed by policy and approved workflows.
- `editor`: organization-scoped write authority allowed by policy.
- `viewer`: organization-scoped read authority.

Membership status is evaluated separately. Only an allowed live state grants access; suspended, removed, expired, pending, or invited records must not silently acquire active authority.

The workshop release continues to limit ordinary accounts to at most one live organization membership. General multi-organization account workflows remain deferred.

### Resource exceptions

- `survey_access_grants` grant access to one survey and its authorized outputs.
- `farm_access_grants` grant access to one farm record; they do not automatically grant survey/output access.

Grants must be explicit, status-aware, expiry-aware, revocable, and auditable where sensitive. Individual farmers should be represented through `people` and `client_people`, with explicit grants when they do not belong to an organization. Do not create fabricated one-person organizations.

### Compatibility relationships

`surveys.client_id`, canonical client mappings, and legacy asset paths remain dataset and routing relationships where still used. They are not profile-owned authorization state and must not replace membership/grant checks.

## Platform Admin Architecture

The approved dedicated admin architecture is described in `docs/admin-dashboard-integration-plan.md`.

- `platform_admin` accounts will land on `/admin`.
- `user` accounts will land on `/dashboard`.
- Admin and user route trees will have separate layouts and independent server-side guards.
- The current `/dashboard/admin/*` UI is transitional until route cutover.
- Effective-access preview is read-only. The authenticated actor remains the platform admin; no selected-user session, token, cookie, or mutation authority is created.

Every admin mutation must authenticate the actor, require platform-admin authority, rely on RLS, validate identifiers and state transitions, and produce the required audit record. UI filtering is never authorization.

## Completed Legacy Migration

### `profiles.account_role`

The removed column duplicated platform-role intent and made `profiles.role` ambiguous. Before removal, dependencies existed in application reads, admin workflows, SQL helpers, verification SQL, pgTAP fixtures, historical migrations, and generated types.

Completed sequence:

1. Stop active application reads and writes.
2. Move platform-admin checks to `profiles.role`.
3. Remove helper, RLS, verification, and pgTAP dependence.
4. Apply `20260812004000_drop_account_role.sql`.
5. Regenerate database types and validate local reset/type-check behavior.

Historical migrations that created or referenced the column remain unchanged as contract history.

### `profiles.organization_id`

The removed column pointed to the mixed historical `clients` table and represented a single-client compatibility assignment, not canonical organization authority.

Completed sequence:

1. Expand membership roles and backfill only approved canonical mappings.
2. Normalize non-platform profile roles to `user`.
3. Cut application and RLS authorization to memberships and grants.
4. Remove the legacy profile-organization fallback.
5. Validate protected-asset, route, admin, and direct RLS parity.
6. Apply `20260812005000_drop_profiles_organization_id.sql` and regenerate types.

Users with no active membership receive no organization access unless an explicit resource grant applies. Suspended or removed memberships do not fall back to a profile-owned organization. No `default_organization_id` replacement is planned; UI defaults are derived from currently accessible resources.

### Historical drop gates

The columns were eligible for removal only after all active app code, SQL helpers, policies, tests, verification scripts, and generated types stopped depending on them; platform-admin allow cases and normal-user deny cases passed; membership/grant parity was proven; and local reset plus type-check validation passed.

These gates are retained for auditability. They are complete for local and staging environments and must not be reintroduced as pending work.

## Current Post-Removal Invariants

Current verification should assert:

- `profiles.role` contains only `platform_admin` and `user`.
- No live application, current policy/helper, verification SQL, pgTAP fixture, or generated type references either removed profile column.
- Platform admins can reach authorized admin operations; normal users cannot.
- Active memberships grant only their organization-scoped authority.
- Suspended, removed, pending, or expired access records fail closed.
- Survey and farm grants authorize only their intended resource scope.
- Individual users without membership or grants see no protected data.
- Protected assets use the same membership/grant authorization model as application reads.
- Admin mutations retain history and produce expected `admin_audit_log` records.
- Access preview reports effective access without issuing another user's session or mutation authority.

Useful current checks include:

```sql
select role, count(*)
from public.profiles
group by role
order by role;

select role, status, count(*)
from public.organization_memberships
group by role, status
order by role, status;

select status, count(*)
from public.survey_access_grants
group by status
order by status;
```

Run database checks only against a confirmed local or non-production target unless a separate production operation is explicitly approved.

## Deferred Enum Cleanup

`public.app_role` still contains historical `org_admin`, `editor`, and `viewer` enum labels because PostgreSQL enum values cannot be removed in place. The validated profile-role check constraint prevents those labels from being stored.

A later migration may rebuild `public.app_role` with only `platform_admin` and `user`. That slice requires dependency inspection, local reset, generated-type regeneration, staging apply, and role/admin smoke validation. It must not be mixed into unrelated admin UI work.

## Deferred Permission Features

- true user-session impersonation
- Auth-user creation and invitation delivery
- platform-admin promotion or demotion
- general multi-organization account workflows
- destructive access-record deletion
- broad infrastructure or asset administration from app runtime

## Change Control

Historical migrations remain untouched. New authorization behavior must be delivered in small reviewed slices with server-side checks, RLS coverage, audit expectations, failure-path tests, and updated compressed project state.
