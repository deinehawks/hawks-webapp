# Backlog

Last updated: 2026-09-10

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
- Approved one-file output-type migration rollout to non-production staging,
  including remote contract/history/inventory verification, no-pending dry-run,
  linked type comparison, full automated regression, and rolled-back
  database-role authorization smoke.
- Signed-in local branch smoke against migrated staging for platform-admin
  selector/edit/lock/current behavior, restored test data, ordinary/anonymous
  redirects, and clean Chrome console/network checks.

## P1

- The staging migration/onboarding gate and Organization Waves 1 and 2 are
  complete. Capacity policy `3e1dd8bd` is integrated. WebODM processing is
  complete, but Wave 3 remains blocked after local `ENOSPC`; physical `C:` had
  73.10 GiB free against the 95 GiB target on 2026-09-07. In a separately
  approved infrastructure session, stop Docker/WSL cleanly, compact the Ubuntu
  VHDX, recheck capacity, start/health-check MinIO, then regenerate and freeze
  the equivalent Wave 3 config. Fresh explicit approval remains required
  before upload. Generate one combined manifest draft only after all expected
  surveys verify.

## P2

- Finish `fix/output-types`: the application/migration contract, local replay,
  backup/rehearsal, approved staging apply, remote verification, automated
  regression, rolled-back database-role smoke, and signed-in local UI against
  staging pass. Integrate and deploy the branch, then complete the remaining
  hosted staging no-mutation smoke. Production remains out of scope.
- Add a platform-admin Dataset Onboarding workflow for client creation,
  confirmed canonical mapping, duplicate preview, reliable primary-farm
  assignment, and atomic batch survey creation.
- Add the next-week survey timeline after Wave 3 is safely running or signed
  off. Keep survey IDs independent; relate authorized surveys through their
  shared primary farm, order entries by `surveys.flight_date`, and switch the
  displayed orthomosaic/3D survey when a date is selected. Historical
  detection versions and side-by-side comparison remain deferred.
- Replace the repeated `/org-admin/farms` and `/org-admin/surveys` cards with
  responsive tables. Keep farm creation, move editing to
  `/org-admin/farms/[farmId]`, and provide an authorized View Data action for
  surveys. Implement this as a separate frontend branch after the migration
  priority permits.
- Add no-organization signup approval and grant-derived dashboard client
  selection so supported individual accounts can consume the private assets.

## Stabilization Cleanup

- Remove the stale `app_private.backfill_legacy_organization_memberships`
  reference.
- Rebuild historical `app_role` labels separately.
- Migrate deprecated `next lint` usage to the ESLint CLI.
- Investigate build heap exhaustion.
- Defer unrelated enum/stub/database cleanup until post-workshop stabilization.
