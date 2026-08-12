# Session Handoff

Last updated: 2026-08-12

Protected asset app-side implementation is in place on `feature/workshop-manifest-gate`. Current active staging manifest is `manifest-2026-08-11`. User-confirmed smoke status: NGINX app access works, login works, authenticated protected tiles work, orthomap renders protected tiles, and the survey 3D tab loads the protected ODM point cloud.

Admin MVP status is user-smoke-confirmed. Platform admins can access `/dashboard/admin`; non-platform users are redirected; overview counts/workflow sections and recent audit rows load; client classification and client canonical mapping work; ordinary membership creation rejects users with existing live memberships; membership detail pages show allowed status transitions only.

Role/permission source of truth is approved and documented in `docs/role-permission-model-and-migration-plan.md`. Target: `profiles.role = platform_admin | user`, `organization_memberships.role = org_admin | editor | viewer`, explicit farm/survey grants for resource exceptions, and no profile-owned organization access state.

Role-model cleanup slices implemented locally and applied to staging:

- `20260812000000_remove_account_role_platform_helper_dependency.sql`
- `20260812001000_expand_membership_roles_and_backfill.sql`
- `20260812001500_apply_membership_role_defaults_and_backfill.sql`
- `20260812002000_normalize_profile_roles_and_cutover_membership_auth.sql`
- `20260812002500_apply_user_role_normalization_and_membership_auth_cutover.sql`
- `20260812003000_remove_legacy_profile_organization_fallback.sql`
- `20260812004000_drop_account_role.sql`
- `20260812005000_drop_profiles_organization_id.sql`
- `20260812005500_enforce_profile_account_role_scope.sql`

Important rollout notes:
- the first staging apply on 2026-08-12 failed safely at `20260812001500` because the migration used `min(uuid)`; the unapplied migration was patched to use `(array_agg(mapping.organization_id order by mapping.organization_id))[1]`, local reset passed, and the retry completed
- `npx supabase migration list` shows staging aligned through `20260812005500`
- staging `profiles.role` rows are clean: 2 `platform_admin`, 21 `user`; the extra enum labels are historical labels, now blocked by `profiles_role_account_scope_check`
- full enum-label removal should be a later enum rebuild migration, not mixed into the individual access workflow

Newest local slice:
- `docs/role-permission-model-and-migration-plan.md` now documents individual farmers as `people` / `client_people` plus explicit survey grants, not fabricated one-person organizations
- `docs/admin-mvp-operator-guide.md` now documents the narrow survey-grant workflow
- `lib/actions/admin-survey-grants.ts` adds a platform-admin-only server action to create active survey grants for existing non-platform profiles and existing surveys
- `app/dashboard/admin/page.tsx` renders a Create survey access grant form and a read-only Survey Access Grants list

Validation:
- local `npm run supabase:reset` passes through `20260812005500`
- local `npx tsc --noEmit --incremental false` passes
- local `npm run lint` still fails only on the pre-existing `components/maplibre.tsx` `@ts-nocheck` ban, with unrelated warnings

Next task: smoke the new survey-grant admin UI after app deployment/local run, then grant `dagaang.viz.hawks@gmail.com` the intended survey access after confirming the correct individual legacy client/person mapping.
