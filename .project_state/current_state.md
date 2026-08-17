# Current State

Last updated: 2026-08-17

Current branch observed by Codex: `feature/workshop-manifest-gate`.

Compressed startup workflow is active through `AGENTS.override.md` and `.project_state/`.

Protected asset baseline remains in place: authenticated NGINX delivery, protected tile/point-cloud routes, workshop manifest gating, and the publisher/report flow are implemented and user-smoke-confirmed for staging control samples.

Dedicated admin status:

- `/admin` has a dedicated layout, navigation, server-side platform-admin guard, and role-based landing.
- Legacy `/dashboard/admin/*` routes redirect to `/admin/*`.
- `/admin/users` lists existing accounts with concise membership/grant access status.
- `/admin/users/[id]` shows account context, membership history, survey/farm grants, and related audit summaries.
- Platform admins can create viewer/editor memberships, update ordinary membership status/role, create survey grants, and revoke/reactivate survey grants through authenticated RLS-bound audited actions.
- `profiles.role` is not mutable in this workflow and remains account-level `platform_admin | user` only.
- Effective-access preview, farm-grant mutations, Auth invitations, platform-admin role changes, true impersonation, deletion, and broad infrastructure controls remain deferred.

Role/permission state:

- `profiles.role` is the sole account-level source.
- `organization_memberships.role` uses `org_admin | editor | viewer`; membership status is evaluated separately.
- Survey/farm grants are resource exceptions.
- `profiles.account_role` and `profiles.organization_id` are removed locally and in staging.
- Historical `app_role` enum labels remain blocked by a check constraint pending a separate enum rebuild.

Validation for the Users & Access slice:

- `npx tsc --noEmit --incremental false`: pass.
- Targeted lint for changed files: pass with no warnings or errors.
- `supabase/tests/domain_authorization.sql`: 40/40 pass.
- Full pgTAP run remains red because older `authorization.sql` and `protected_asset_authorization.sql` fixtures reference removed schema fields.
- Unauthenticated `/admin/users` request redirects to `/auth/login` on the local server.
- Authenticated visual smoke remains manual because the in-app browser runtime failed to start in this environment.