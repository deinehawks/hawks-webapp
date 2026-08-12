# Current State

Last updated: 2026-08-12

Current branch observed by Codex: `feature/workshop-manifest-gate`.

Compressed startup workflow is active through `AGENTS.override.md` and `.project_state/`.

Workshop protected-asset baseline remains in place: authenticated NGINX delivery works for the approved staging manifest, the app uses protected tile/point-cloud routes successfully, and the workshop asset publisher/report flow is implemented locally.

Admin MVP is user-smoke-confirmed. Platform-admin access, non-platform redirect, client classification/mapping workflows, allowed membership transitions, and the read-only Recent Admin Activity list are working. The admin surface remains intentionally mostly read-only.

Approved role/permission target model is documented in `docs/role-permission-model-and-migration-plan.md`:
- `profiles.role` is the account-level role source (`platform_admin | user` target)
- `organization_memberships.role` is the organization-level role source (`org_admin | editor | viewer` target)
- explicit survey/farm grants remain resource exceptions
- individual farmers are modeled through `people` / `client_people` plus explicit survey grants, not fabricated one-person organizations

Role-model implementation status:
- `20260812000000_remove_account_role_platform_helper_dependency.sql` removed live platform-admin helper dependence on `profiles.account_role`
- `20260812001000` through `20260812002500` expanded membership roles, backfilled memberships from confirmed legacy mappings, normalized non-platform `profiles.role` values to `user`, regenerated local DB types, and shifted app/RLS authorization toward memberships and grants
- `20260812003000_remove_legacy_profile_organization_fallback.sql` removed the live SQL/RLS fallback to `profiles.organization_id`
- `20260812004000_drop_account_role.sql` drops `profiles.account_role`, its index, and the now-unused enum/function dependency
- `20260812005000_drop_profiles_organization_id.sql` drops `profiles.organization_id`, its FK/index, and remaining compatibility trigger checks; `app_private.current_organization_id()` remains as a compatibility stub returning `null`
- `20260812005500_enforce_profile_account_role_scope.sql` adds a validated check constraint so `profiles.role` can only store `platform_admin` or `user`
- PostgreSQL enum labels still include historical `org_admin`/`editor`/`viewer`; actual rows are constrained and clean, while full enum rebuild is deferred as a separate cleanup slice
- admin overview now includes a platform-admin-only survey access grant workflow for individual users and a read-only Survey Access Grants list

Validation baseline:
- local `npm run supabase:reset` passes through `20260812005500`
- local `npx tsc --noEmit --incremental false` passes after the individual survey-grant workflow
- local `npm run lint` still fails only on the pre-existing `components/maplibre.tsx` `@ts-nocheck` ban, with unrelated warnings remaining
- staging Supabase has all migrations through `20260812005500`
- staging `profiles.role` rows are normalized: 2 `platform_admin`, 21 `user`, and no `org_admin`/`editor`/`viewer` profile rows
- `dagaang.viz.hawks@gmail.com` is `profiles.role = user` with 0 total memberships and 0 active memberships, so access should be granted through explicit survey grants after the appropriate individual client/person mapping is confirmed
