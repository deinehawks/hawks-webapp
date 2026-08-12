# Active Context

Last updated: 2026-08-12

Current epic: workshop-safe role/permission cleanup alongside protected-asset workshop readiness.

Completed sequence:
1. Protected asset manifest/RPC/auth groundwork. Completed.
2. Protected asset pilot smoke and publisher workflow. Completed locally and user-smoke-confirmed.
3. Admin MVP workflow review, wording polish, and recent audit visibility. Completed locally.
4. Role-model target documentation. Completed locally.
5. Remove active `profiles.account_role` dependence from app/admin flows, helper checks, verification SQL, and pgTAP coverage. Completed locally.
6. Expand `organization_memberships.role`, backfill memberships, normalize non-platform `profiles.role` values to `user`, regenerate local DB types, and shift app/RLS authorization toward memberships/grants with transitional compatibility. Completed locally.
7. Remove the remaining app-side default-client preference and the live SQL/RLS fallback to `profiles.organization_id`. Completed locally through `20260812003000_remove_legacy_profile_organization_fallback.sql`.
8. Prepare actual field removal with final local drop migrations for `profiles.account_role` and `profiles.organization_id`, clean live app/admin/test references, and validate on a local reset. Completed locally through `20260812004000_drop_account_role.sql` and `20260812005000_drop_profiles_organization_id.sql`.
9. Apply the full `20260812` role-cleanup migration wave to the linked staging Supabase project. Completed on 2026-08-12 after patching `20260812001500` for staging-safe UUID aggregation.
10. Add and apply `20260812005500_enforce_profile_account_role_scope.sql` to staging so only `platform_admin` and `user` can be stored in `profiles.role`. Completed.
11. Document and implement the narrow individual-farmer survey grant workflow in the admin overview. Completed locally.

Current validation results:
- local `npm run supabase:reset` passes through `20260812005500`
- local `npx tsc --noEmit --incremental false` passes
- local `npm run lint` still fails only on the pre-existing `components/maplibre.tsx` `@ts-nocheck` rule, with unrelated warnings
- staging `npx supabase migration list` shows local and remote aligned through `20260812005500`
- protected-asset workshop smoke baseline remains previously confirmed by the user

Key constraints:
- Keep auth/RLS/server-action boundaries fail-closed
- Do not reintroduce `profiles.organization_id` as a live authorization source
- Do not use organization memberships for individual farmers unless they truly belong to an organization
- Preserve protected asset browser-facing paths and NGINX boundary assumptions
- Treat production rollout as a separate approval step

Next recommended task:
- Smoke the new admin survey-grant form locally/staging after app deployment, then grant `dagaang.viz.hawks@gmail.com` the intended survey access through the admin workflow after confirming the correct individual legacy client/person mapping.
