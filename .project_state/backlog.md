# Backlog

Last updated: 2026-08-25

## Completed

- Output Operations and Access Policy v2 staging rollout.
- Two-role membership and grant-only member authorization.
- User-first signup confirmation, review, approval/rejection, and pending state.
- Full staging access/session smoke matrix.
- Local org-admin narrow RPC migration, audit/policy changes, clean replay,
  focused 16-test pgTAP suite, and generated type refresh.
- Protected `/org-admin` context, routing, RPC-only server actions, and
  overview/organization/members/onboarding/grants/farms/read-only-surveys pages.
- Removed the org-admin Outputs surface and survey/output mutation RPCs through
  corrective migration `20260824000000`.
- TypeScript, targeted ESLint, combined 142-test pgTAP, and whitespace checks
  for the org-admin application slice.
- Non-production org-admin inventory, checksummed backup, isolated restore,
  exact migration/containment rehearsal, two-migration staging apply, linked
  history/contract/type verification, and automated post-apply checks.
- Authenticated org-admin staging smoke for onboarding, membership/grant
  lifecycles, read-only surveys, absent Outputs, and prohibited boundaries.
- Platform-admin onboarding review queue, narrow audited approve/reject RPCs,
  generated contracts, focused/full pgTAP validation (11/11 and 153/153), and
  the complete single-migration non-production staging rollout gate.
- Authenticated staging smoke for org-admin onboarding submission and
  platform-admin review; the org-admin phase is complete.
- Org-admin branch handoff and integration into `development`.
- Local survey identity/client-field contract, narrow platform-admin RPC,
  locked admin UI, generated types, and focused/full validation.
- Survey-contract application deployment and signed-in staging smoke against
  `dcad51f2`, including restored metadata, compatibility checks, and denied-role
  coverage.
- Local org-admin dashboard landing, shared access resolver, reusable
  Organization Admin dropdown, persistent normal application sidebar across
  dashboard/admin pages, and focused TypeScript, ESLint, and whitespace
  validation.

## P1

- Deploy and smoke the org-admin dashboard navigation on staging. Verify
  desktop/mobile dropdown behavior, the seven existing protected destinations,
  normal-member denial, read-only Surveys, and absent Outputs.

## P2

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
