# Session Handoff

Last updated: 2026-09-25

Current branch: `fix/workshop-share-retries` (uncommitted).

Access Policy v2 is fully smoke-validated in staging. The user confirmed all
member, org-admin, membership-transition, platform-exception, rejected-signup,
anonymous, and cross-organization cases passed. Production is unchanged.

This session started the Organization Admin phase:

- Added `supabase/migrations/20260820000000_org_admin_portal.sql`.
- Added strict active-org resolution and narrow audited RPCs for the approved
  organization-admin workflows.
- Removed broad direct membership/onboarding mutation policies.
- Preserved platform-only boundaries for Auth accounts, organization status,
  resource relationships, survey/output creation, publication, platform
  exceptions, and operational asset/readiness fields.
- Added `supabase/tests/org_admin_portal.sql` with 16 passing assertions.
- Clean local migration replay passed.
- Existing pgTAP passed 126/126 before the focused org-admin suite; the new
  focused suite passed 16/16 separately.
- Regenerated `lib/database.types.ts` from the local schema and removed an
  accidental encoding BOM without hand-editing the generated contracts.
- Added the protected `/org-admin` context, active-organization post-login
  routing, sidebar/layout, loading/error states, and RPC-only actions.
- Added overview, organization profile, members, onboarding, grants, farms, and
  read-only surveys. Outputs remain platform-admin-only.
- Added local corrective migration `20260824000000`, removed the org-admin
  survey/output actions and output route, and regenerated types without those
  RPCs.
- TypeScript, targeted ESLint, full pgTAP (142/142), and whitespace checks pass.

The user confirmed the pre-rollout portal behavior locally. Both org-admin
migrations are now applied to staging after affected-data inventory,
checksummed backup, isolated restore with matching counts, exact migration and
containment rehearsal, and a two-file-only dry-run. Linked history is current;
11 approved RPCs exist, survey/output mutation RPCs are absent, and the audit
triggers plus grant-read policies are present. Linked types were regenerated;
TypeScript, targeted ESLint, and full pgTAP (142/142) pass. Linked DB lint still
reports only the known stale backfill function. Production is unchanged.

The user completed authenticated org-admin staging smoke; all onboarding,
membership/grant lifecycle, read-only survey, absent Output, and prohibited
boundary cases behaved as expected.

The platform-admin onboarding review queue is implemented
through `20260824001000_admin_onboarding_request_review.sql`,
`/admin/onboarding-requests`, and narrow approve/reject RPC actions. Approval
records intent/reviewer metadata only and hands account activation to the
existing user-first Signup Approvals flow. Direct authenticated request-table
mutation is revoked. Focused pgTAP passes 11/11, the full suite passes 153/153,
and TypeScript, targeted ESLint, and whitespace checks pass.

The corrective migration's single-file staging gate passed on
`llealjcaqvltrtdwwzrh`: affected-data inventory; fresh checksummed schema/Auth/
Public backup; isolated restore with matching counts; exact migration and
containment replay; one-file dry-run and apply; remote history, policy,
permission, and no-pending verification; and linked type regeneration. The
post-apply TypeScript, targeted ESLint, whitespace, and full pgTAP checks pass.
Linked DB lint still reports only the known stale legacy backfill function.
Production is unchanged.

The user completed authenticated staging smoke for organization-admin
onboarding submission and the platform-admin review queue; both worked as
expected. The org-admin/onboarding review phase is complete in staging.

The completed org-admin branch is pushed and merged into `development` at
`d3f6f32a`. `feature/survey-contract` was created from that updated tip.

The first survey contract stage is implemented locally. Stable identity and
client compatibility fields are locked in the platform-admin UI and omitted
from its mutation payload. A narrow platform-admin RPC updates only approved
metadata, direct authenticated table updates are revoked, and the existing
survey audit trigger remains authoritative. No legacy columns or asset paths
were removed. The contract is documented in
`docs/survey-identity-client-contract.md`.

Clean local replay, generated types, focused pgTAP 8/8, full pgTAP 161/161,
TypeScript, targeted ESLint, and whitespace checks pass. Local DB lint reports
only the known stale legacy backfill function.

The aggregate-only staging inventory completed read-only on 2026-08-25. All 108
surveys have valid client references and aligned legacy codes, with no
output-pointer mismatches. There are 107 null organization codes and nine
duplicated non-null survey-code groups; both fields therefore remain
nullable/non-unique and locked.

The staging database rollout is complete. Four checksummed backups are retained
under `backups/staging-survey-contract-20260825/`; an isolated restore matched
all compared counts. Exact migration/containment/reapply, one-file dry-run,
apply, remote history/no-pending checks, contract/permission verification,
linked types, full pgTAP 161/161, TypeScript, targeted ESLint, and rolled-back
database-role smoke passed. Staging now denies direct authenticated survey
updates and exposes the narrow RPC. Survey and audit counts remain 108 and 144.
Linked DB lint reports only the known stale backfill function.

The completed `feature/survey-contract` application and database slice is
integrated into `development`. Signed-in staging smoke passed on deployment
`dcad51f2`: the approved edit persisted and was restored, locked fields were
unchanged, existing routes/assets worked, organization-admin and ordinary-user
editing remained denied, anonymous access failed closed, and no new browser
errors appeared. The survey-contract staging gate is closed.

The user-tested org-admin navigation work is merged into `development` at
`0739e44c`; the current branch starts from that tip.

The workshop batch workflow is implemented locally. The ignored private
allowlist is populated. The earlier exclusion of `AH-026012` and
`AH-026013` was withdrawn;
both may be explicitly selected. Preparation discovers direct/nested
`Z:\surveys\2026` layouts, blocks unreviewed PCDs and missing
canonical staging mappings, groups at most three surveys, and checks MinIO
capacity. Reviewed configs are SHA-256 frozen before the single hidden runner
can stream, resume, and verify uploads. Manifest SQL is generated only after
verification and never runs automatically. Focused tests and static checks
pass. Production and database state are unchanged.

Preparation now prefers validated linked staging pooler metadata when explicit
database host settings are absent, avoiding reliance on the unavailable direct
database hostname while preserving the staging project lock. It also reports
per-survey progress and uses bounded file-stat concurrency for large Z-drive
inventories.

The corrected full dry run completed. `AH-026012` is ready with 24,352 tiles
and one approved PCD, and `AH-026013` is ready with 13,514 tiles and one
approved PCD. The remaining 29 selections have no exact staging survey row;
`AH-026038` additionally has empty round- and sharp-corner tile directories.
No generated wave, upload, database mutation, or other external write occurred.
The capacity check passes only for the currently ready 6.7 GB transfer, not for
the blocked selections.

`AH-026038` is unfinished and will be removed, leaving 30 workshop surveys
and 28 missing staging survey identities. The existing
Platform Admin UI can create organizations but cannot create clients, surveys,
or batch dataset records. Use a reviewed staging-only onboarding transaction
for the current batch; preparation must remain read-only.

The supplied intake classifies 17 surveys under individual clients and 13 under
organization clients. No personal contact details were written to Git.
Individual/private publishing remains implemented without fabricated
organizations, with distinct wave IDs and one 30-survey combined-manifest gate.

The workshop database staging gate is complete. Fresh ignored checksummed
schema/Auth/Public backups restored with matching captured counts, and both the
original and BSBG-ID-locked transactions passed fresh-clone rehearsals. The
user explicitly approved and staging applied only migration
`20260826000000` followed by the exact reviewed onboarding transaction.
Remote history, authorization contract, direct-execution denial, and
no-pending checks pass.

Post-commit and independent preview verification show 30 selected surveys, 28
draft inserts, correct compatibility values, 13 confirmed organization
relationships, zero private organization relationships, the intended canonical
mappings, unchanged Auth/profile/grant counts, and the onboarding audit. BSBG
is organization/cooperative with all five relationships.

The 13-survey organization preparation passes with zero blocked/unreviewed
items and capacity for about 51.07 GiB. Five local wave files exist. The pilot
rule isolates `AH-026012` and `AH-026013` in Wave 1; later waves contain 3,
3, 3, and 2 surveys.

Organization Wave 1 is signed off in staging. The reviewed checksum matches,
the runner stopped after successful completion, and the user-confirmed
full-object check found zero failures among 37,868 objects totaling
6,705,469,416 bytes. Tiles and one point cloud for each survey verified, all
four capacity checks passed, and four organization-protected manifest entries
were emitted. No partial manifest SQL was generated or activated. Evidence is
in `docs/workshop-organization-wave-001-signoff-2026-08-28.md`.

The Node warning follow-up is complete. NVM now selects Node.js 22.22.0; the
repository declares Node 22 through `package.json` and `.nvmrc`; Node type
definitions and the lockfile resolve to 22.20.1. AWS SDK imports pass without
the prior warning, and focused workshop tests 18/18, targeted ESLint, and
TypeScript pass. These runtime checks remain the validated baseline for later
organization waves. Production, Auth users, memberships, grants, and Supabase
records are unchanged.

Wave 2 is signed off in staging from the frozen configuration
`workshop-organization-wave-002-2026-08-28T10-37-28-724Z.jobs.json`.
The user explicitly approved the staging upload. The frozen checksum remained
`aa185ca748082ac178f9745514728f9b008fe3d7d224a1e8354162c66b005c16`.
The single background runner completed all five groups and stopped cleanly with
an empty error log. All 383,975 objects totaling 24,142,306,973 bytes passed
`verified`, existence, content-length, group-count, and group-byte checks. All
five capacity checks passed, and five organization-protected manifest entries
match the separate artifact exactly. No partial manifest SQL was generated or
activated. Production, database/Auth state, memberships, and grants remain
unchanged. Evidence is in
`docs/workshop-organization-wave-002-signoff-2026-09-01.md`.

Wave 3 is frozen as
`workshop-organization-wave-003-2026-09-01T03-14-31-908Z.jobs.json` for
`AH-026023`, `AH-026024`, and `AH-026028`, with SHA-256
`374734d07c67b7a5bcf48c7c924f7b958e51064127cda764139c64e59caa932c`.
The approved staging runner stopped on local `ENOSPC`, emitted no completed
verification report, and left the ignored Wave 3 state file at zero bytes.
The runner remains stopped. Publisher JSON writes are now atomic, and an empty
resume-state file safely reinitializes so remote object sizes can drive resume;
focused tests pass 18/18. Preserve the ignored frozen config and runner
evidence, free local disk space, and resume this exact config before Wave 3
verification and sign-off. No manifest was generated or activated.

Preserve unrelated user-owned scratch/deletion state in `.tmp/`, `issues.txt`,
`workflow.txt`, and `improve.txt`.

The User App Preview slice is implemented locally under
`/user-app-preview/[profileId]`. A dedicated full-screen user-style sidebar
replaces the Admin shell during preview and provides Dashboard, every
accessible client orthomap, every accessible survey, selected-user context,
and Exit Preview. Data remains target-scoped without changing the platform-admin
session. Entry points exist on User Detail and Access Preview. No mutation,
schema, RLS, or service-role change was made. TypeScript, focused ESLint, full
pgTAP 170/170, workshop tests 18/18, diff checks, route compilation, and
anonymous login redirect smoke pass. The user passed authenticated smoke: the
Admin sidebar disappears, user-style navigation works, and Exit Preview returns
to the selected user's Admin record. The feature is integrated into
`development` at `2a359188`.

Capacity policy merge `3e1dd8bd` changes the reserve from the larger of
15%/100 GiB to the larger of 5%/20 GiB while retaining 10% transfer overhead.
Preparation emits shared values and review/publish reject stale capacity
metadata. Focused tests pass 18/18, ESLint and TypeScript pass, and the runbook
requires a physical Docker Desktop host-drive check. The existing frozen Wave 3
config and checksum remain untouched; no runner, upload, manifest, or staging
mutation ran. An earlier running-container audit reported about 1.33 TiB
logical free space, but Docker Desktop stores its data VHD on `C:`. The
2026-09-03 gate found 80.70 GiB physical free space against the 95 GiB target,
and `hawks-minio` was stopped. No Wave 3 config was regenerated or frozen.
Next, free the required host capacity, start and health-check MinIO through the
approved infrastructure workflow, then regenerate, review, and freeze the
equivalent Wave 3 config without uploading. Resume still requires fresh
explicit approval.

Wave 3 is now deferred until next week because WebODM is actively using
Docker. The latest `C:` reading is 76.08 GiB free against the 95 GiB gate.
Do not stop Docker/WSL or compact the Ubuntu VHDX until WebODM finishes.

The next P2 slice is implemented locally on `fix/output-types`. Shared
application values and Admin selectors restrict output types to
`orthomosaic`, `point_cloud`, `object_detection`, and `other`; server
actions enforce the same contract. Migration `20260904000000` aborts on
legacy-metadata or current-selection conflicts, preserves each unsupported
original value in `metadata.legacy_output_type`, normalizes it to `other`,
and installs the exact database check constraint. Aggregate pre/post inventory,
guarded containment, and updated authorization/output-operation fixtures are
included.

Node 22.22.0, `npx next typegen`, `npx tsc --noEmit`, focused ESLint, and
`git diff --check` pass. Docker-dependent clean replay and focused/full pgTAP
were intentionally not run. The aggregate staging query also remains pending
because the current local service-role credential was rejected. Do not apply
the migration remotely until valid read-only inventory, checksummed backup,
isolated rehearsal, and separate explicit approval are complete. No staging,
production, Docker, MinIO, Wave 3, or asset state was mutated.

The user subsequently passed the authenticated output-management UI smoke:
all four selector values, create/edit behavior, locked/current restrictions,
role denial, and browser console/network checks behaved correctly. Treat this
as pre-rollout UI evidence because the environment was not confirmed as
post-migration staging; the database and staging gates remain open.

The aggregate-only staging inventory subsequently succeeded through the
locked staging database resolver inside `begin read only`: two total outputs,
both `orthomosaic`; zero unsupported values, conflicting
`legacy_output_type` metadata, or normalization current-selection
collisions. The migration will not rewrite existing staging output rows.

After WebODM processing completed, the approved clean local Supabase reset
replayed every migration and seed successfully, including
`20260904000000_restrict_survey_output_types.sql`. Focused pgTAP passes 21/21,
the full 11-file suite passes 171/171, and workshop regression passes 18/18.
Local DB lint reports only the known stale backfill function. Next route type
generation, TypeScript, focused ESLint, and `git diff --check` pass. The local
gate is closed. Fresh ignored schema/Auth/Public backups are SHA-256
checksummed and restore into isolated database
`output_types_rehearsal_20260907` with all 27 compared counts matching staging.
Exact migration/containment/reapply passes with `UPDATE 0`, an unchanged output
row fingerprint, and focused clone pgTAP 21/21 before and after reapply. The
linked dry-run lists only migration `20260904000000`. Evidence is in
`docs/output-types-staging-rehearsal-2026-09-07.md`.

The user separately approved applying only migration `20260904000000` to
non-production staging `llealjcaqvltrtdwwzrh`. The one-file apply succeeded.
Remote history contains one row, the exact four-value constraint is validated,
the two-row output inventory and fingerprint are unchanged, and linked dry-run
is clean. Linked types showed no schema declaration change. Full pgTAP 171/171,
workshop regression 18/18, route type generation, TypeScript, focused ESLint,
whitespace, and linked DB lint with only the known stale backfill finding pass.
A fully rolled-back database-role smoke allowed a platform-admin `other`
insert, rejected `report` with `23514`, and denied ordinary/anonymous inserts
with `42501`; the two staging rows remained identical. Evidence is in
`docs/output-types-staging-rollout-2026-09-10.md`. The automated staging gate is
closed. The output implementation is integrated into `development` at
`76c8e915`. The user passed the final hosted no-mutation Chrome smoke through
`http://localhost:8080/asimov-hawks`: platform-admin sign-in, output list,
exact four-value selector, draft/current/archived presentation and locking,
ordinary-user and anonymous redirects, console, and network checks all passed.
No form was submitted and no staging data changed. The output-type staging gate
is closed; production is unchanged.

Hosted smoke initially stalled because Tailwind automatic source discovery did
not complete under Webpack or Turbopack. Branch `fix/tailwind-source-scan`
explicitly limits discovery to application source directories, covering every
tracked utility-bearing file. Normal `npm run dev` now compiles `/auth/login`
in 10.5 seconds and serves it through NGINX. TypeScript, focused ESLint, and
whitespace checks pass. The fix is uncommitted and pending normal integration.

Docker recovered with existing data intact. The VHD was reclaimed from 802.68
GiB to 633.29 GiB during the interrupted elevation sequence, leaving 230.94 GiB
free on `C:`. NGINX and MinIO health return `200`, local Supabase retains only
the known vector restart condition, and WebODM retains 21 projects. The Wave 3
checksum and zero-byte state are unchanged. Wave 3 remains paused pending the
decision on a dedicated 4 TB MinIO drive; do not regenerate, upload, relocate
storage, build a manifest, or access production.

The Tailwind source-boundary fix is integrated into `development` at
`6653aa45`. Platform Admin Dataset Onboarding is implemented locally on
`feature/dataset-onboarding` with a two-step reviewed UI, shared fail-closed
database validation, and authenticated platform-admin-only preview/commit
RPCs. Commit uses a transaction advisory lock and creates the complete client,
owner mapping, draft survey, primary-farm, organization relationship, and
summary-audit batch atomically.

Clean replay and all automated behavior checks pass: onboarding pgTAP 37/37,
full pgTAP 208/208, workshop regression 18/18, route types, TypeScript, and
targeted ESLint. Database lint contains only the known stale legacy backfill
finding. The local generator includes both RPCs but omits the prior hosted-only
PostgREST marker and writes an extra EOF blank; the guard correctly prevented
manual editing of generated types. Whole-tree `git diff --check` therefore
reports that generated EOF only; authored files are clean.

The user completed the full signed-in local onboarding smoke against
127.0.0.1:54321. New organization preview/commit, preview invalidation,
created survey links/details, existing private preview, duplicate/existing-ID
and farm-owner conflicts, inline errors, ordinary/anonymous redirects, console,
and network checks all passed. Evidence is in
docs/dataset-onboarding-local-smoke-2026-09-11.md.

Final branch review and the staging rehearsal are complete. Review made the
existing-survey conflict case-insensitive and added a fail-closed owner-role
containment check. Aggregate staging inventory found no duplicate-ID or owner
conflicts. Eligibility is now limited to confirmed `owner` or `operator`
relationships: two staging farm-organization relationships qualify and zero
farm-person relationships qualify. Private onboarding is therefore unavailable
on staging until that prerequisite is separately created and reviewed.

Fresh Auth/Public staging backups are checksummed under the ignored
`backups/staging-dataset-onboarding-20260914/` directory. All 48 compared base
tables matched in the isolated clone after excluding only intentionally omitted
managed Auth migration history. Exact migration, confirmed containment, and
reapply preserved the relevant-row fingerprint; clone pgTAP passed 37/37. A
clean local replay, focused pgTAP 37/37, full pgTAP 208/208, workshop 18/18,
route types, TypeScript, targeted ESLint, and authored whitespace pass. The
linked dry-run lists only migration `20260911000000`. Full evidence is in
`docs/dataset-onboarding-staging-rehearsal-2026-09-14.md`.

The user explicitly approved and the CLI applied migration `20260911000000` to
non-production staging. Direct read-only verification confirms exactly one
remote history row; all three functions are owned by `postgres`, are
`SECURITY DEFINER`, and have empty search paths. Authenticated may execute only
the public RPCs, anon cannot, and the private validator remains inaccessible.
The owner/operator eligibility rule and aggregate inventory are correct, with
two qualifying organization farm relationships and zero qualifying person
relationships. The post-apply linked dry-run is clean.

Linked staging type generation restored the PostgREST 14.5 marker, retained
both RPC contracts, and added only hosted-generator conditional-type
parentheses. TypeScript and whitespace pass. Dataset Onboarding is merged into
`development` at `b35c50f5`; the user passed the post-merge no-mutation
smoke and observed much faster compilation after the Tailwind source-boundary
fix. Production, Wave 3, MinIO, assets, and onboarding records remain untouched.

The final smoke-evidence commit `0a2b76e0` remains only on the old local
`feature/dataset-onboarding` branch and was not included in PR #13. Keep it
separate from feature work and integrate it later through a documentation-only
PR if the detailed rollout record is required in `development`.

After observing that hosted staging owns the functions as `postgres` while the
clone uses `supabase_admin`, the containment artifact was made owner-portable:
it dynamically verifies that the current operator can assume the deployed
owner. Missing-confirmation and wrong-role executions fail closed, while the
owner containment/reapply cycle preserves the relevant-row fingerprint. Its
final SHA-256 is
`bd2e2f3a334ab65c20db51e593c2a3ccf43a440293a3217b2b348240271aa79c`.

Org-admin farm/survey tables are implemented and validated on
`feature/org-admin-tables`. Farm creation remains on the farm list; confirmed
farms are tabular and edit through `/org-admin/farms/[farmId]`, which verifies
the current admin organization's confirmed farm relationship before loading.
The existing audited update RPC remains authoritative. Confirmed surveys are
tabular and View Data uses `/dashboard/surveys/[surveyId]`, preserving its
independent authentication and RLS. Route type generation, TypeScript, targeted
ESLint, whitespace, and anonymous NGINX redirects pass. The user-assisted smoke
also passes authenticated farm edit/restore, cross-organization denial, View
Data and unauthorized-survey denial, responsive tables, role boundaries, and
clean browser console/network checks. Evidence is in
`docs/org-admin-tables-local-smoke-2026-09-14.md`.

The org-admin table slice is integrated into `development` at `49355d2e`;
the user reports that its post-merge smoke passed.

Survey Timeline was implemented on `feature/survey-timeline`. The
server loader authenticates independently, uses canonical primary
`survey_farms` links and normal-session RLS, returns dated same-farm surveys
newest first with deterministic ID ordering, and reports output availability
without hiding surveys that have neither output. User App Preview calculates
the selected user's effective survey set first and queries relationships only
for those IDs. The responsive component uses horizontally scrollable links on
desktop and a select on narrow screens. Existing routes are retained and the
viewer provider is keyed by survey ID to reset to Orthomosaic. The user
confirmed the initial UI smoke behaves correctly. The approved visual
refinement now uses shadcn Card composition, clearer date/current hierarchy,
compact icon-based output indicators, scroll snapping, a richer mobile current
summary, tailored empty states, and improved accessibility semantics without
changing timeline behavior.

Route typegen, TypeScript, targeted ESLint, whitespace, workshop regression
18/18, and anonymous NGINX redirect smoke pass; the same automated gates pass
after the UI refinement. The user then completed the full post-refinement
responsive smoke using representative primary-farm data. Normal and User App
Preview routes, desktop/mobile navigation, timeline states, ordering,
availability, viewer reset, authorization boundaries, keyboard behavior, and
console/network health all pass. Evidence is in
`docs/survey-timeline-smoke-2026-09-17.md`. It is integrated into
`development` at `db137c74`. No staging or
production relationship change is authorized by this smoke; staging assignment
retains a separate reviewed gate. Historical detections, processing dates,
grouping, and comparison remain deferred.

The approved client-level Orthomap Survey dates filter was implemented on
`feature/orthomap-date-filter` and merged locally into `development` at
`5f941ce2`. It preserves All dates, groups
eligible accessible orthomosaics by UTC flight date, uses a desktop
scroll-snap strip/mobile Select, and consistently filters rasters, boundaries,
labels, detections, FOI counts/layers, events, and popups through the same
visible survey IDs. The base style remains stable; boundary and label GeoJSON
is reactive. Selection clears stale interaction/loading state and refits to
boundary bounds or finite survey extents with the approved camera settings.
It does not reuse the farm-scoped timeline and makes no schema, RLS, storage,
asset-path, route, or external-prop change.

Next route type generation, TypeScript, targeted ESLint, whitespace, workshop
regression 18/18, login HTTP, and anonymous redirect checks pass. Targeted
ESLint reports zero errors and 17 existing warnings in the modified map file,
down from 36 warnings on the development baseline; the new filter is clean.
Authenticated multi-date interaction smoke remains pending because the current
local dataset does not contain enough surveys with different flight dates to
exercise the filter meaningfully. When representative data is available, run
the manual checklist in
`docs/orthomap-date-filter-local-validation-2026-09-17.md` and record any
findings before treating interactive validation as complete.

On 2026-09-22 MinIO was moved from the Ubuntu ext4 backend on `C:` to the
approved 1 TB decimal dynamic XFS VHDX at `D:\MinIO\minio-data.vhdx`. The copy
was performed with MinIO stopped. Source/destination counts match, the
metadata-aware dry comparison is empty, and both content trees hash to
`4d48ba4c69cacc5ddab3c5840b2c1b1f57b2fe950cc38994ebb177aebf0ca50b`.
The original data remains at
`/home/deine/asimov-hawks-storage/minio-data.rollback-20260922`.

Docker required recreation of only `hawks-minio` to clear its stale bind-mount
inode. Its pinned image ID, credentials/configuration, ports, network, service
identity, and `/data` path were preserved; restart policy remains `no`. The
guarded startup helper now pins the image, validates UUID/XFS/mount/bind and
both reserves, and stops MinIO on post-start guard failure. Real restart and
absent-VHD fail-closed tests pass. Wave 1-2 report hashes/counts/bytes and 14
authenticated object samples remain correct. Workshop tests pass 21/21;
targeted ESLint, TypeScript, PowerShell/JSON parsing, and whitespace pass.

Do not regenerate or upload Wave 3 yet. First complete authenticated browser
asset/application smoke, correct the NGINX localhost health probe, confirm
direct MinIO ports and anonymous bucket listing are isolated from
external access, and schedule the coordinated Windows/WSL/Docker restart test.
Keep the rollback copy and use only the manual startup helper. Full evidence is
in `docs/minio-storage-relocation-signoff-2026-09-22.md`.

During signed-in storage smoke, survey `AH-0260001` exposed a viewer-only tile
zoom floor and unreachable HOT OSM endpoint. The survey map now uses the
dataset's z11 minimum, retains z15 only as the no-coordinate fallback, applies
more useful fit padding/max zoom, and both map views use the standard OSM tile
endpoint. The user confirmed the orthomosaic, basemap, and zoom-out behavior.

The user then approved a sleeker survey-detail presentation. The implementation
removes the timeline and viewer outer cards, uses a compact timeline rail (and
a concise single-survey row), keeps the survey heading on the page, and joins
the view/mode/FOI/Info controls to the sole bordered map/3D surface. No data,
route, auth/RLS, preview-scope, or asset contract changed. Focused ESLint has
zero errors with 37 pre-existing map warnings; TypeScript, whitespace, login
HTTP, and anonymous survey redirect checks pass. The user completed and passed
the full authenticated normal/preview desktop/tablet/mobile smoke checklist.
The single-survey row now has a compact `text-xs` date and a responsive
vertical-desktop/horizontal-mobile divider between date and survey details.
The focused visual refinement passes on desktop, mobile/tablet, normal routes,
and User App Preview; multi-survey behavior remains unchanged and no new
console/network error was observed. Post-polish TypeScript, PowerShell parsing,
whitespace, and workshop regression 21/21 pass. Targeted ESLint has zero
errors; the reported 54 warnings are existing map warnings, not timeline
findings.

On 2026-09-23 the user reported an empty MinIO console and missing survey
orthomosaics after an uncontrolled restart. `hawks-minio` had resumed against
the ordinary Ubuntu ext4 directory while the XFS VHDX was detached. It was
stopped immediately. The disk and data were intact; the expected UUID was
reattached and mounted, the exact stale MinIO Docker Desktop bridge was
cleared, and only the `minio` Compose service was recreated from authoritative
configuration with restart policy `no`. Post-recovery validation shows a
healthy container, in-container XFS, all five buckets, HTTP 200 health, and an
HTTP 200 representative `AH-0260001` tile.

The guarded helper now starts `vmms` when needed, handles `blkid -U` exit 2 as
a detached disk, and stops an already-running non-XFS MinIO before any further
storage work. PowerShell parsing, whitespace, successful recovery startup, and
an idempotent helper rerun pass. The machine-local Compose `minio` restart
policy is now also `no`; the live service was not restarted or recreated by
that edit. The exact 65-byte untracked recovery-command artifact was removed,
while unrelated scratch files and both underlying/rollback `.minio.sys` trees
were left untouched. The coordinated restart test must wait for the active
`AH-026095` pipeline run and WebODM work to finish and requires separate
approval immediately before restarting Windows. NGINX health, direct-port
containment, coordinated restart acceptance, and the Wave 3 gate remain open.

The coordinated restart then ran after `AH-026095` was paused and WebODM was
stopped. MinIO did not auto-start, but the helper attached the VHDX and detected
`ext2/ext3` inside `/data` because Docker Desktop retained the stale pre-mount
bridge. It stopped MinIO, so the acceptance test failed safely. Recovery
mounted the intact XFS UUID, cleared only the verified stale bridge, recreated
only MinIO from authoritative Compose, and passed the guard. MinIO is healthy
on XFS with all five buckets; capacity, baseline tile/point-cloud access, and
anonymous protected-route denials pass. The helper default config path was
fixed for Windows PowerShell and the exact elevated npm startup command passes
idempotently. Browser control did not reconnect after Windows, so signed-in
Survey/Orthomap rendering and console/network checks need one manual
confirmation. Keep WebODM and the pipeline stopped. Do not start Wave 3 until
stronger mount ordering, NGINX health, direct-port containment, and repeat
restart acceptance pass; the user will run and monitor any later upload.

Stronger mount ordering is implemented and the repeat cold-start storage test
passes. Docker Desktop automatic sign-in startup and its Windows Run entry are
disabled. The single elevated `npm run minio-storage:start` command owns
startup, preserves MinIO restart `no`, and validates the exact retained XFS
UUID under Docker Desktop's Ubuntu bind bridge when an independent WSL shell
later exposes the underlying ext4 path. The accepted container is healthy on
XFS with all five buckets and matching representative tile/point-cloud bytes.
Workshop regression 21/21, PowerShell/JSON parsing, and whitespace pass. The
user passed final signed-in Survey, 3D, Orthomap, authorized/cross-scope,
five-bucket, and clean console/network smoke.

Branch `fix/minio-host-capacity` was finalized as `bf53ddfb` and pushed. The
separate stacked branch `fix/minio-edge-hardening` fixes the machine-local
NGINX health probe to IPv4 loopback and publishes MinIO 9000/9001 only on
`127.0.0.1`. Both asset buckets deny anonymous listing while retaining exact
GetObject access needed by the existing unsigned internal NGINX upstream after
`auth_request`. NGINX and MinIO are healthy, `/data` is XFS, all five buckets
exist, LAN port checks fail, exact representative assets return 200, and
anonymous protected NGINX paths return 401. The helper enforces exactly one
loopback binding per port and a true second run preserves container ID/start
time. TypeScript, workshop 21/21, PowerShell/JSON, Compose, and whitespace
checks pass. The user passed the final signed-in Survey orthomosaic, 3D point
cloud, BARBCO2026 Orthomap, authorized/cross-scope, and clean console/network
smoke. Edge-hardening acceptance is complete. WebODM, `AH-026095`, and Wave 3
remain stopped. Next, regenerate/review/freeze and checksum the same Wave 3
scope, then obtain separate upload approval. The user will run and monitor the
upload.

Both MinIO branches are merged into updated `development` (`193a4500` and
`8af15a59`). The historical Wave 3 reviewed config still matches checksum
`374734d07c67b7a5bcf48c7c924f7b958e51064127cda764139c64e59caa932c`,
and its resume state remains zero bytes. WebODM is stopped; MinIO is healthy
with restart `no` and `/data` on XFS.

Two read-only organization preparation attempts failed before writing output.
The first stopped while scanning an AH-026022 Z-drive tile directory; after it
became readable again, a second attempt reached AH-026023 and failed the same
way on another directory. PowerShell and Node both observed the temporary
absence and later successful enumeration, indicating a transient mapped-share
availability issue rather than a bad tile tree. No upload, reviewed config,
manifest, database mutation, or refresh artifact exists.

Current branch `fix/workshop-share-retries` has uncommitted changes in
`scripts/lib/workshop-assets.js`, `scripts/prepare-workshop-assets.js`, and
`scripts/tests/workshop-assets.test.js`. Recognized transient directory-read
and file-stat failures now retry visibly with bounded backoff for approximately
60 seconds; persistent transient and non-transient failures still stop safely.
Workshop regression passes 24/24; targeted ESLint, TypeScript, and whitespace
pass. The elevated agent context cannot see mapped `Z:`, so the first next
action is one preparation run from the user's normal PowerShell with
`WORKSHOP_HOST_VOLUME_ROOT=D:\`, `WORKSHOP_ASSET_STAT_CONCURRENCY=8`, and
output root `.tmp/workshop-assets/regenerated-20260923`. Review all output and
the exact three-survey Wave 3 before freezing; do not start upload or manifest
work.

## 2026-09-25 workshop migration handoff

The preceding preparation handoff is complete. The user ran all five
organization waves and all six private waves sequentially. Read-only audit
confirms 11 completed reports, 30/30 unique expected surveys, no missing,
unexpected, or cross-report duplicate survey, no denied capacity check,
1,944,728 objects, and 109,695,980,633 bytes. The runner is stopped after
Private Wave 006; its process exited and stderr is empty.

The combined review-only draft now exists at
`.tmp/workshop-assets/verification/combined-manifest-draft.sql`, with matching
JSON inventory beside it. It contains 41 artifact entries and has not been
applied. SQL SHA-256:
`f56db2d90a276d3ab7b2f70095f1be390f737a4b3fc063f6bbfc44429091dd36`.
JSON SHA-256:
`581afc0b858c5eb9760594926e9240c1e984542877359d2f17775ae84999c313`.

The retry branch is committed and pushed as `92dabf5a`. Current branch
`ops/workshop-manifest-rollout` contains the rollout packager and rehearsal
evidence. The ignored package pins `manifest-2026-09-25`
(`b07905c4-71ae-4df6-a834-14fbbae13552`) to
`manifest-2026-08-11`. Its 41 entries cover 30 surveys.

The ACL-complete ignored staging backup restored cleanly; all 53 Auth/Public
table counts match. Draft/verify, containment/reapply, reviewed/atomic
cutover, active verification, forward recovery, and fail-closed confirmation
checks pass in the isolated clone. Optional backup alias/timestamp fields are
intentionally null. No staging data changed.

Next: review and commit this branch, then obtain explicit approval before
running only `01-draft-apply.sql` on non-production staging. Activation
requires later authorization/external asset smoke and separate approval.
Production remains untouched. See
`docs/workshop-manifest-staging-rehearsal-2026-09-25.md`.
