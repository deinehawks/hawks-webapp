# Backlog

Last updated: 2026-10-05

Latest priority override: dynamic survey publishing is implemented and
integrated into `development`. Completed: user-assisted V3 controls and V2
member discovery, tiles, PCD, cross-scope denial and login/logout smoke
(all ten steps). Next: confirm UEMPC's requested one-survey Member configuration,
then separately scope publication lifecycle test actions and record acceptance.
V2's independent compatibility branch is clean and pushed at `9c507324`.
Exact-hash staging approval/apply and history/contract/preservation
verification are complete; no pending migration remains. All 52 existing counts,
26 application-table fingerprints and 77 active manifest entries are unchanged;
the publication table is empty. No output was published or retired.
Security review, fresh backup, 52-table isolated restore parity, guarded
rollback/reapply and focused pgTAP 38/38 are complete. Production remains out
of scope. Staging now provides the verified discovery RPC required by V2.
Evidence: `docs/dynamic-survey-publishing-staging-rehearsal-2026-10-05.md`.

Pending user access configuration: change the active UEMPC membership from
Org Admin to Member, then confirm only AH-026032 in preview/V2. The separate
removed membership does not remove the still-active admin role. Read-only RLS
and discovery confirm this role, not a grant-revocation or V2 filtering bug,
permits the other three surveys. No remote membership/grant change occurred.

Separate follow-up: review the existing anonymous SELECT grant on
`organizations`; RLS returns zero rows, but the clean staging-schema suite is
245/246 because its permission-error assertion expects the grant revoked.
Read-only staging checks confirm all other tested domain tables deny anonymous
SELECT. This predates the publishing migration; do not silently harden it in
that migration or describe the full staging-schema suite as passing.

Latest priority override: the 56 geospatial CSVs are validated and the guarded
r2 package passed isolated no-commit, apply/verify, duplicate-apply rejection,
rollback/baseline restore and reapply/verify. The exact-hash staging apply and
frozen verification then passed: 56/56 target surveys are complete, both
pre-existing metadata surveys remain preserved, and manifest/output state is
unchanged. Representative V2 orthomap and authorization smoke passed in the
user-assisted 2026-10-05 checklist; the older pending-smoke status is superseded. Do not
use the superseded r1 package. Production remains unchanged.

Latest priority override: the additional batch and cumulative package
preparation are complete. Unknown dates may remain null. Preserve the current
AH-026012/AH-026013 output rows/counts/pointers. V2's exact asset mapping is
implemented and validated. Fresh backup, isolated r4 rehearsal, explicitly
approved staging apply, exact post-apply verification and audited review-only
transition passed. Authenticated inactive-manifest denial also passed through
the healthy V2 proxy. The guarded activation package has a fresh backup and a
passing isolated rollback/apply/verify rehearsal. The exact-hash activation was
then separately approved and passed in staging: the 77-entry replacement is
approved/active and the old manifest is superseded/inactive. Frozen verification
and anonymous fail-closed checks pass. Next repeat the signed-in permitted-user
and denied cross-scope asset smoke, then complete recording acceptance.
Production remains out of scope.
See docs/workshop-cumulative-recording-package-2026-09-29.md. Older P1 upload
waiting instructions below are historical, not actions to repeat.

## Completed

- Local admin survey-ID display correction across survey lists, overview
  tables, output links, grants and selectors, plus 25-row server pagination,
  stable date/ID ordering, partial-ID search and responsive table controls;
  automated checks pass and authenticated browser smoke is pending.
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
- Explicitly approved Dataset Onboarding migration apply to non-production
  staging, direct remote contract/privilege/inventory verification, clean
  post-apply dry-run, and linked staging type regeneration.
- Dataset Onboarding integration into `development` at `b35c50f5` and
  successful post-merge no-mutation smoke, with detailed evidence in
  `docs/dataset-onboarding-staging-rollout-2026-09-14.md`.
- Org-admin farm/survey responsive tables, scoped farm detail editing, survey
  View Data action, integration into `development` at `49355d2e`, and
  successful post-merge smoke.
- Survey Timeline implementation, complete responsive/authenticated smoke, and
  integration into `development` at `db137c74`.
- MinIO relocation to the 1 TB XFS VHDX, stronger manual mount ordering,
  repeat cold-start acceptance, healthy IPv4 NGINX probe, loopback-only direct
  ports, denied anonymous bucket listing, retained protected exact-object
  delivery, and final signed-in Survey/3D/Orthomap smoke.
- Workshop filesystem retry fix committed/pushed as `92dabf5a`; all 11 asset
  waves and the combined 30-survey verification are complete.
- Checksummed workshop manifest staging backup and ignored rollout package,
  53-table isolated restore parity, exact draft/containment/cutover rehearsal,
  forward-recovery rehearsal, focused tests, and targeted ESLint.

## P1

- Recover or reimplement the approved survey-event/flight slice on
  `feature/survey-flights`. The earlier smoke-tested files and org-admin
  survey-loader fix are absent from the worktree and Git recovery metadata, so
  the feature is not complete despite the reported smoke results.

## P2

- The Orthomap client-level Survey dates filter is merged locally into
  `development` at `5f941ce2`. Complete authenticated responsive smoke when
  representative multi-date surveys are available; preserve All dates by
  default and normal/preview authorization fail-closed. See
  `docs/orthomap-date-filter-local-validation-2026-09-17.md`.
- Add no-organization signup approval and grant-derived dashboard client
  selection so supported individual accounts can consume the private assets.

## Stabilization Cleanup

- Remove the stale `app_private.backfill_legacy_organization_memberships`
  reference.
- Rebuild historical `app_role` labels separately.
- Migrate deprecated `next lint` usage to the ESLint CLI.
- Investigate build heap exhaustion.
- Defer unrelated enum/stub/database cleanup until post-workshop stabilization.
