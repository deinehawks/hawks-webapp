# Platform Admin Operator Guide

Last updated: 2026-08-24
Status: Access Policy v2 staging role smoke passed; org-admin portal implemented locally and awaiting authenticated smoke

This guide covers the dedicated `/admin` surface. The permission model is in
`docs/role-permission-model-and-migration-plan.md`; database rollout and
recovery are in `docs/supabase-migration-runbook.md`.

## Access boundary

Only authenticated `profiles.role = platform_admin` accounts may use `/admin`.
All actions authenticate again server-side and rely on RLS. UI visibility is
not authorization. Never place service-role credentials in the application
runtime.

## Accounts, memberships, and signup

- `/admin/users` and user detail pages show account, membership, grant, and
  audit context.
- Membership roles are only `member` and `org_admin`.
- Active membership opens the organization portal. A member receives no farm,
  survey, output, or protected-asset access until explicitly granted.
- An active org admin receives management visibility over confirmed
  organization resources.
- Suspension makes organization-scoped grants ineffective. Removal retains the
  membership record and atomically revokes its active scoped grants.
- Inactive organizations block organization-scoped access and management.

Users create and confirm their own Auth accounts first. Their profile remains
`pending` and can access only the pending-account surface. Use
`/admin/signup-approvals` to review the resulting request, select an active
organization and initial `member` or `org_admin` role, then approve or reject
it. Approval atomically activates the profile and creates its membership.
Rejection leaves the Auth account present but blocks application access.

The org-admin database mutation contract and application portal are implemented
locally. Do not treat the checked-in migration or routes as evidence of staging
or production deployment.

## Organization administrator portal

An active `user` profile with exactly one active `org_admin` membership in an
active organization lands on `/org-admin`. Zero or multiple matching
memberships fail closed. The portal contains:

- overview and organization profile editing;
- ordinary-member suspension, reactivation, removal, and promotion;
- onboarding requests for platform review;
- organization-scoped farm and survey grants;
- confirmed farm creation/metadata management;
- read-only confirmed survey metadata.

The portal cannot create Auth accounts, surveys, or outputs; edit survey
metadata; view or manage Outputs; alter organization
status or resource relationships; issue platform exceptions; change existing
org-admin memberships; or mutate storage, readiness, current-output, or
publication fields. All writes call the narrow audited RPCs and remain subject
to RLS and database validation.

Signup confirmation requires the exact application callback to be present under
Supabase Authentication -> URL Configuration -> Redirect URLs:
http://localhost:3000/asimov-hawks/auth/confirm for local staging smoke and
the equivalent HTTPS URL for each deployed environment. The signup action sends
this callback explicitly, and the route accepts both Supabase PKCE code
callbacks and token-hash email templates. Confirmation links are single-use.
Use custom SMTP before broader invited-user testing; the built-in sender is
project-wide rate-limited and is not a production mail service.

Platform admins do not create Auth accounts from the Next.js runtime.

## Resource grants

- A farm grant exposes only that farm.
- A survey grant exposes that survey and its outputs.
- Organization-scoped grants require active membership and a confirmed matching
  organization-resource relationship.
- A platform exception has no organization scope and is intended for a narrow
  individual exception.

Use the access preview as a read-only diagnosis. It never switches the
platform-admin session or issues user-equivalent authority.

## Other platform operations

Organization, farm, survey, and output pages retain the existing audited
platform-admin operations. Survey/output creation, storage/readiness/current
selection, publication gates, organization status, and resource relationships
remain platform responsibilities. Output publication, asset relocation,
deletion, and broad infrastructure operations remain separately gated.

## Validation checklist

Before a workshop account relies on the new model:

1. Confirm the organization is active and resource relationships are confirmed.
2. Confirm the account has one intended active membership.
3. For a member, create only the farm/survey grants actually required.
4. Verify access preview shows the expected effective resources.
5. Smoke login, email confirmation where applicable, session refresh, dashboard,
   protected tiles, point clouds, detections, and denial outside scope.
6. Suspend and remove only through approved workflows; verify scoped access
   fails closed and the audit record remains.

Staging or production database application requires the separate backup,
inventory, migration, validation, and recovery gate in the runbook.
