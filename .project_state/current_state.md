# Current State

Last updated: 2026-08-13

Current branch observed by Codex: `feature/workshop-manifest-gate`.

Compressed startup workflow is active through `AGENTS.override.md` and `.project_state/`.

Protected asset baseline remains in place: authenticated NGINX delivery, protected tile/point-cloud routes, workshop manifest gating, and the publisher/report flow are implemented and user-smoke-confirmed for the staging control samples.

Dedicated admin shell status:

- A dedicated `/admin` route tree and layout now exist locally for `platform_admin` users.
- The former `/dashboard/admin/*` pages are now transitional redirects to `/admin/*`.
- Existing admin overview/detail workflows were moved under `/admin` without changing their underlying server actions, RLS reliance, or mutation scope.
- Root landing plus password-login and OTP-confirm redirects now send `platform_admin` users to `/admin` and `user` accounts to `/dashboard`.
- Platform admins still have an explicit navigation path back into the user application through the admin shell.

Admin scope still in force:

- Users & Access for existing accounts is the first delivery wave.
- Effective-access preview remains planned and read-only; it never creates another user's session.
- Admin mutations still require authenticated server actions, platform-admin checks, RLS, transition validation, and audit coverage.
- Auth-user invitations, platform-admin role changes, true impersonation, destructive deletion, and broad infrastructure controls remain deferred.

Role/permission state:

- `profiles.role` is the account-level source and permits `platform_admin | user`.
- `organization_memberships.role` is the organization-level source and uses `org_admin | editor | viewer`.
- survey/farm grants are resource exceptions.
- `profiles.account_role` and `profiles.organization_id` are removed locally and in staging.
- historical `app_role` enum labels remain blocked by a check constraint pending a separate enum rebuild.

Validation note for this slice:

- `git diff --check` is being used as the formatting gate for current local edits.
- `npx tsc --noEmit --incremental false` and `npm run lint` both exceeded the local timeout window during this session, so they are not yet recorded as pass/fail for this slice.
