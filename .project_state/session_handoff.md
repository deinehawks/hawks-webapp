# Session Handoff

Last updated: 2026-08-13

The role-model migration wave is implemented locally and applied to staging through `20260812005500`. `profiles.role` is the sole account-level source, membership roles provide organization authority, grants provide resource exceptions, and both legacy profile columns are gone. The extra PostgreSQL enum labels remain a deferred cleanup only.

The dedicated admin shell now exists locally under `/admin`. It uses its own layout/sidebar, keeps server-side `platform_admin` guarding, and reuses the existing admin overview/detail workflows without changing the underlying mutation boundaries. The former `/dashboard/admin` routes now redirect to `/admin`.

Role-based landing is also wired locally: the root page plus password-login and OTP-confirm flows now send `platform_admin` users to `/admin` and `user` accounts to `/dashboard`. Platform admins still have an explicit navigation path back into the user app from the admin shell.

Authoritative docs remain:

- `docs/admin-dashboard-integration-plan.md` for admin architecture and delivery order.
- `docs/role-permission-model-and-migration-plan.md` for authorization semantics and migration history.
- `docs/supabase-migration-runbook.md` for rollout history and current invariants.

Next task: build dedicated `/admin` Users & Access routes, then add the read-only effective-access preview.

Validation note: `npx tsc --noEmit --incremental false` and `npm run lint` both timed out during this session, so they still need a clean recorded result for this slice.

Do not touch unrelated scratch work currently visible in `.tmp/`, `issues.txt`, `workflow.txt`, or the user-owned deletion of `improve.txt`.
