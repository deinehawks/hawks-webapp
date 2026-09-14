# Backlog

Last updated: 2026-09-11

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
- Tailwind source-boundary fix integrated into `development` at `6653aa45`.
- Local Platform Admin Dataset Onboarding UI, narrow preview/commit RPCs,
  generated contracts, clean replay, focused pgTAP 37/37, full pgTAP 208/208,
  workshop regression 18/18, route types, TypeScript, and targeted ESLint.
- Signed-in local Dataset Onboarding smoke covering successful organization
  commit, private preview, invalidation, blocking conflicts, inline errors,
  redirects, survey links, console, and network health.
- Final Dataset Onboarding branch review, case-insensitive existing-ID guard,
  aggregate staging inventory, fresh checksummed Auth/Public backup, 48-table
  isolated restore comparison, containment/reapply rehearsal, owner/operator-only
  farm eligibility, clone pgTAP 37/37, and one-migration linked dry-run.

## P1

- Organization Waves 1 and 2 are complete. Host capacity now passes with
  230.94 GiB free on `C:` after Docker VHD reclamation, and Docker, MinIO,
  Supabase, NGINX, and WebODM recovered with existing data intact. Wave 3
  remains paused pending approval for a dedicated 4 TB MinIO drive. Preserve
  the frozen checksum and zero-byte state. Storage relocation, regeneration,
  upload, and manifest work require separate plans and explicit approval;
  production remains out of scope.

## P2

- Resolve the Dataset Onboarding generated-type metadata/EOF review, then apply
  its single migration to non-production staging only after separate explicit
  approval. Follow with remote contract checks and signed-in hosted smoke.
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
