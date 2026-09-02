# Backlog

Last updated: 2026-09-02

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
- Org-admin dashboard navigation, user validation, push, and integration into
  `development` at `0739e44c`.
- Local workshop asset batch tooling, private allowlist, staging/data/capacity
  gates, reviewed background upload flow,
  verification output, focused tests, and operator runbook.
- Organization Wave 1 staging upload, full 37,868-object verification, four
  protected manifest-entry outputs, and user sign-off.
- Node.js 22.22.0 workshop-tooling upgrade, repository runtime declaration,
  Node 22 type alignment, AWS SDK import smoke, focused tests, targeted ESLint,
  and TypeScript validation.
- Organization Wave 2 review, freeze, approved staging upload, full
  383,975-object verification, five protected manifest-entry outputs, clean
  runner shutdown, and sign-off.
- Read-only User App Preview with a dedicated full-screen user-style sidebar,
  target-scoped navigation, multi-client links, and authenticated smoke.

## P1

- The staging migration/onboarding gate and Organization Waves 1 and 2 are
  complete. Wave 3 stopped on local `ENOSPC`. Integrate committed policy
  change `7c7d44fe`, raise physical `C:` free space from the audited
  81.56 GiB to at least 95 GiB, regenerate and freeze the equivalent Wave 3
  config, obtain fresh explicit approval, resume from verified remote objects,
  and sign it off before processing later waves individually. Generate one
  combined manifest draft only after all expected surveys verify.

## P2

- Restrict output types on `fix/output-types`, including affected-row
  inventory and legacy-value metadata preservation.
- Add a platform-admin Dataset Onboarding workflow for client creation,
  confirmed canonical mapping, duplicate preview, and atomic batch survey
  creation.
- Add no-organization signup approval and grant-derived dashboard client
  selection so supported individual accounts can consume the private assets.

## Stabilization Cleanup

- Remove the stale `app_private.backfill_legacy_organization_memberships`
  reference.
- Rebuild historical `app_role` labels separately.
- Migrate deprecated `next lint` usage to the ESLint CLI.
- Investigate build heap exhaustion.
- Defer unrelated enum/stub/database cleanup until post-workshop stabilization.
