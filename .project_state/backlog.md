# Backlog

Last updated: 2026-08-24

## Completed

- Output Operations and Access Policy v2 staging rollout.
- Two-role membership and grant-only member authorization.
- User-first signup confirmation, review, approval/rejection, and pending state.
- Full staging access/session smoke matrix.
- Local org-admin narrow RPC migration, audit/policy changes, clean replay,
  focused 16-test pgTAP suite, and generated type refresh.

## P1

- Build the protected `/org-admin` portal and RPC-backed server actions.
- Validate permitted org-admin workflows and prohibited self-admin,
  cross-organization, platform-exception, relationship, creation, publication,
  and operational-field mutations.
- After application validation, prepare and execute the non-production
  inventory/backup/rollback/staging gate for `20260820000000`.

## P2

- Contract survey identity/client fields on `feature/survey-contract`.
- Build read-only User App Preview on `feature/user-app-preview`.
- Restrict output types on `fix/output-types`, including affected-row
  inventory and legacy-value metadata preservation.
- Continue workshop asset readiness after authorization work.

## Stabilization Cleanup

- Remove the stale `app_private.backfill_legacy_organization_memberships`
  reference.
- Rebuild historical `app_role` labels separately.
- Migrate deprecated `next lint` usage to the ESLint CLI.
- Investigate build heap exhaustion.
- Defer unrelated enum/stub/database cleanup until post-workshop stabilization.
