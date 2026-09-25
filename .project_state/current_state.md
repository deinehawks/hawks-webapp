# Current State

Last updated: 2026-09-25

Current branch: `fix/workshop-share-retries`, based on updated `development`
after storage merge commits `193a4500` and `8af15a59`.

Access Policy v2 is complete in staging and unchanged in production. The user
manually passed the full staging authorization matrix: grant-only member,
farm-only, survey/output, org-admin visibility, suspension/reactivation,
removal, platform exception, rejected signup, anonymous, and cross-organization
denial. User-first signup confirmation, pending review, approval, membership
assignment, and activated login also passed.

Organization Admin phase status:

- Local migration `20260820000000_org_admin_portal.sql` implements narrow
  security-definer RPCs for organization profile edits, onboarding requests,
  ordinary-member status changes and promotion, farm creation/editing, and
  organization-scoped grant lifecycle.
- Direct broad membership/onboarding mutation policies are removed.
- Cross-organization resources, platform exceptions, Auth creation,
  relationships, survey/output creation, publication, and operational asset
  fields remain prohibited.
- Survey and farm-organization audit triggers were added; organization code/type
  edits are allowed only for the actor's active organization while organization
  status remains platform-admin-only.
- The migration replays successfully on a clean local database.
- Existing pgTAP passed 126/126; dedicated org-admin pgTAP passed 16/16.
- Database types were regenerated from the validated local schema.
- The protected `/org-admin` route tree includes overview, organization,
  members, onboarding, grants, farms, and read-only surveys. Outputs are not
  exposed to organization admins.
- Post-login routing sends an active org admin in one active organization to
  `/org-admin`; platform admins remain in `/admin` and members in
  `/dashboard`.
- All portal writes authenticate through the strict org-admin context and call
  only the narrow RPCs.
- TypeScript, targeted ESLint, full pgTAP (142/142), and whitespace validation
  pass.
- Corrective migration `20260824000000_restrict_org_admin_survey_output.sql`
  removes the org-admin survey/output mutation RPCs from the database contract.

Both org-admin migrations are applied to non-production staging after a clean
inventory, checksummed backup, successful isolated restore, exact migration and
containment rehearsal, and ordered dry-run. Remote history and no-pending checks
pass; the 11 approved RPCs are present while survey/output mutation RPCs remain
absent. Linked types, TypeScript, targeted ESLint, and full pgTAP (142/142)
pass. The user completed authenticated staging smoke for onboarding,
membership/grant lifecycles, read-only surveys, absent Outputs, and prohibited
boundaries; all behaved as expected. Production is unchanged.

Corrective migration `20260824001000_admin_onboarding_request_review.sql`
adds the platform-admin onboarding queue, narrow approve/reject RPCs,
review notes, audited review metadata, and RPC-only table mutation. Approval
does not create an account or membership; user-first Signup Approvals remains
the activation path. Its single-migration non-production staging gate passed:
inventory, checksummed backup, isolated restore with matching counts, exact
migration/containment replay, one-file dry-run, apply, remote history and
contract verification, linked type regeneration, TypeScript, targeted ESLint,
and full pgTAP (153/153). The user then passed authenticated staging smoke for
org-admin request submission and platform-admin onboarding review. The
org-admin/onboarding review phase is complete in staging. Production is
unchanged.

The completed org-admin branch is pushed and merged into `development` at
`d3f6f32a`. The first survey identity/client-field contract stage is
implemented locally on `feature/survey-contract`:

- `id`, `code`, `client_id`, `access_code`, and
  `organization_code` remain stored compatibility fields and are read-only in
  the platform-admin survey workflow.
- Editable metadata is limited to status, location, flight date, area, area
  code, type, and category through narrow audited RPC
  `platform_admin_update_survey`.
- Direct authenticated survey updates are revoked; operational service-role
  scripts remain separate.
- No survey columns, routes, relationships, storage keys, or asset paths are
  removed.
- Clean local replay, generated types, focused pgTAP 8/8, full pgTAP 161/161,
  TypeScript, targeted ESLint, and whitespace checks pass. Local DB lint reports
  only the known stale legacy backfill function.

The aggregate read-only staging inventory completed on 2026-08-25: all 108
surveys have codes, access codes, valid client references, and aligned legacy
values; output pointers have no mismatches. There are 107 null organization
codes and nine duplicated non-null survey-code groups, so those compatibility
fields remain nullable/non-unique and immutable. The pre-migration inventory
showed the expected broad update privilege and no contract RPC.

The survey-contract staging database gate then completed: four checksummed
schema/Auth/Public backups are retained under the ignored recovery directory;
the isolated restore matched all compared counts; exact
migration/containment/reapply, one-file dry-run, apply, remote history,
no-pending verification, linked types, full pgTAP 161/161, TypeScript, targeted
ESLint, and rolled-back database-role authorization smoke passed. Direct
authenticated survey updates are now denied in staging and the narrow RPC is
live. The 108 survey rows and 144 audit rows remained unchanged after smoke.
Linked DB lint reports only the known stale backfill function. The application
code is integrated into `development`. The signed-in staging application smoke
passed on deployment `dcad51f2`: the approved update persisted and was restored,
identity/client fields stayed locked, routes/assets remained operational, and
organization-admin, ordinary-user, and anonymous denial boundaries held without
new console/network errors. The survey-contract staging gate is closed.
Production is unchanged.

The user-tested org-admin navigation correction is integrated into
`development` at `0739e44c`. Both route trees retain Orthomap, Survey Data,
and the fail-closed Organization Admin dropdown. Authorization, RLS, read-only
Surveys, and absent Outputs remain unchanged.

The workshop asset batch workflow is implemented locally on
`feature/workshop-asset-batches`. `AH-026012` and `AH-026013` are eligible
for explicit selection after the earlier exclusion decision was corrected. It
discovers direct/nested
Z-drive layouts, validates staging relationships read-only, generates waves of
at most three surveys, freezes reviewed configs, capacity-gates and verifies
streaming uploads, and emits review-only manifest SQL. No upload, database
mutation, production change, manifest activation, or 1 GB PCD limit occurred.

The private allowlist is now populated and its full 31-selection read-only dry
run completed. Only `AH-026012` and `AH-026013` are source/staging-ready;
the other 29 selections have no exact staging survey identity match, and
`AH-026038` additionally has empty tile-variant directories. Capacity passes
for the two ready surveys, but no wave was generated. No upload or database
mutation occurred.

`AH-026038` was confirmed as unfinished and will be removed, leaving a
30-survey batch with 28 missing staging survey identities.
The Platform Admin UI can create organizations but not new clients, surveys, or
batch dataset records. The temporary P1 path is a reviewed staging-only
onboarding transaction.

The supplied ownership intake classifies 17 surveys under individual clients
and 13 under organization clients. Its reviewed staging transaction has now
created the missing canonical records and relationships.

Dual-scope workshop support is implemented locally. Preparation resolves
explicit organization/private scope from canonical mappings; publishing
accepts null-organization private entries; per-wave output is verification-only;
and one combined manifest draft requires complete unique reports for all 30
surveys. Migration `20260826000000_harden_workshop_asset_scopes.sql` enforces
organization, private, and platform-admin protection semantics. Clean local
replay, focused JavaScript 18/18, TypeScript, targeted ESLint, and full pgTAP
170/170 pass. A read-only active-manifest inventory found six canonical
organization entries and two legacy individual/null-organization entries, all
still labeled organization; the migration preserves their existing
`domain_can_read_survey` behavior until the combined superseding manifest.

The workshop database staging gate is complete. Fresh checksummed backups and
two isolated clone rehearsals passed before migration
`20260826000000_harden_workshop_asset_scopes.sql` and the exact reviewed
onboarding transaction were applied to staging. Remote history, function
security, direct-execution denial, and no-pending checks pass. Staging now has
all 30 selected surveys: 28 draft inserts, 13 confirmed organization
relationships, zero private organization relationships, correct compatibility
values, unchanged Auth/profile/grant counts, and the expected audit. BSBG is
now `organization`, mapped to an active `cooperative`, with five confirmed
survey relationships.

Post-apply organization preparation found all 13 surveys ready, zero blocked
or unreviewed point clouds, and passing capacity for about 51.07 GiB. Five
local waves were regenerated with an explicit pilot rule. Wave 1 contains only
`AH-026012` and `AH-026013`; the remaining 11 surveys are grouped into four
waves of at most three.

Organization Wave 1 is signed off in staging. Its reviewed configuration
checksum matches and the full verification check passed for 37,868 objects
totaling 6,705,469,416 bytes. Both surveys have verified tile and point-cloud
groups, all four capacity checks passed, and four organization-protected
manifest entries were emitted. No partial manifest SQL was generated or
activated. The Wave 2 tooling prerequisite is complete: NVM now uses Node.js
22.22.0, the repository declares Node 22, Node type definitions are aligned at
22.20.1, AWS SDK imports pass without the prior warning, and the focused 18/18
tests, targeted ESLint, and TypeScript pass. Production, Auth users,
memberships, grants, and Supabase records are unchanged.

Organization Wave 2 is signed off in staging from the frozen configuration
`workshop-organization-wave-002-2026-08-28T10-37-28-724Z.jobs.json`. Its
checksum remained `aa185ca748082ac178f9745514728f9b008fe3d7d224a1e8354162c66b005c16`.
All 383,975 expected objects totaling 24,142,306,973 bytes verified across
the tile and point-cloud groups for `AH-026014`, `AH-026015`, and
`AH-026022`. All five capacity checks passed, every remote object exists with
the expected content length, and five organization-protected manifest entries
match the separate entry artifact. The runner stopped with an empty error log.
No manifest SQL was generated or activated; production, database/Auth state,
memberships, and grants remain unchanged. Evidence is in
`docs/workshop-organization-wave-002-signoff-2026-09-01.md`.

Organization Wave 3 is frozen as
`workshop-organization-wave-003-2026-09-01T03-14-31-908Z.jobs.json` for
`AH-026023`, `AH-026024`, and `AH-026028`; its SHA-256 is
`374734d07c67b7a5bcf48c7c924f7b958e51064127cda764139c64e59caa932c`.
The approved staging run stopped on local `ENOSPC` before sign-off and left a
zero-byte ignored state file. No manifest was generated or activated. The
publisher now uses atomic JSON replacement and safely reinitializes only an
empty resume-state file, allowing existing remote object sizes to be checked on
the next run. Focused tests pass 18/18. Free local disk space before resuming
the exact frozen Wave 3 config.

The read-only User App Preview is implemented locally under
`/user-app-preview/[profileId]`. Its dedicated full-screen user-style shell
replaces the Admin sidebar during preview and exposes the target user's
dashboard, every accessible client orthomap, and every accessible survey.
The actor session is unchanged; no impersonation, mutation,
service role, RLS weakening, or database migration is introduced. Effective
survey scope mirrors Access Policy v2 and detections are filtered to visible
survey IDs. TypeScript, focused ESLint, full pgTAP 170/170, workshop tests
18/18, whitespace checks, and anonymous redirect smoke pass. Authenticated
responsive sidebar smoke passed: the Admin sidebar is replaced, user-style
navigation works, and Exit Preview returns to the selected user's Admin record.
The feature is integrated into `development` at `2a359188`.

The workshop capacity policy is integrated into `development` at `3e1dd8bd`
and now retains the larger of 5% or 20 GiB after 10% transfer overhead.
Generated configs use shared policy constants, and review/publish reject stale
policy metadata. The existing frozen Wave 3 config remains unchanged under the
old policy and must be regenerated, reviewed, frozen, checksummed, and
explicitly approved before any resume. Docker Desktop stores MinIO in its
`C:`-hosted data VHD. The 2026-09-03 gate found only 80.70 GiB free against
the 95 GiB target, and `hawks-minio` was stopped. No Wave 3 config was
regenerated or frozen.

Docker Desktop was force-stopped cleanly after its normal stop timed out, and
the Docker VHD was verified detached. During the interrupted elevation sequence
the VHD was reclaimed from 802.68 GiB to 633.29 GiB; no further compaction was
run. The final 2026-09-11 reading was 230.94 GiB free on `C:`, above the 95 GiB
gate. Docker restarted normally: NGINX and MinIO health returned `200`, the
MinIO data root remained populated, local Supabase returned with only the known
vector restart condition, and WebODM retained 21 projects. The Wave 3 checksum
remains `374734d07c67b7a5bcf48c7c924f7b958e51064127cda764139c64e59caa932c`
and its resume state remains zero bytes. Despite available capacity, Wave 3 is
paused pending the decision on a dedicated 4 TB MinIO drive. No regeneration,
upload, manifest, pruning, storage relocation, or production action occurred.

The survey output-type restriction is implemented on
`fix/output-types`. Admin forms now offer only `orthomosaic`,
`point_cloud`, `object_detection`, and `other`; server actions enforce
the same set. Migration `20260904000000_restrict_survey_output_types.sql`
preserves unsupported historical values in `metadata.legacy_output_type`,
normalizes them to `other`, and aborts on metadata/current-selection
conflicts before changing rows. Aggregate inventory, guarded containment, and
updated pgTAP fixtures are included. Node 22, Next route type generation,
TypeScript, focused ESLint, and whitespace checks pass. Clean replay, pgTAP,
staging inventory, checksummed backup, and isolated rehearsal now pass; staging
apply remains separately gated. The user-reported
authenticated UI smoke passed for the four-option selector, create/edit
behavior, locked/current behavior, role denial, and browser console/network
checks; the smoke environment was not established as staging, so it does not
close the staging database gate. No Docker, MinIO, staging, or production
mutation occurred.

The aggregate-only staging output-type inventory then passed through the
repository's locked database resolver in a read-only transaction: two total
outputs, both `orthomosaic`, with zero unsupported values, conflicting
legacy metadata, or normalization current-selection collisions. No staging
rows were changed during that gate. The backup/rehearsal gate subsequently
passed; the later approved apply is recorded below.

The clean local database reset/replay now passes from the full migration
history through seed completion, including migration `20260904000000`.
Focused output pgTAP passes 21/21, the full suite passes 171/171, and workshop
regression passes 18/18. Next route generation, TypeScript, focused ESLint, and
whitespace validation pass. Database lint reports only the documented stale
`app_private.backfill_legacy_organization_memberships` error. The local gate is
closed. Fresh ignored schema/Auth/Public backups are SHA-256 checksummed and
restore successfully into an isolated clone with all 27 compared counts
matching staging. Exact migration/containment/reapply passes with `UPDATE 0`,
an unchanged two-row fingerprint, and focused clone pgTAP 21/21 before and
after reapply. The linked dry-run lists only migration `20260904000000`.
Detailed rehearsal evidence is in
`docs/output-types-staging-rehearsal-2026-09-07.md`.

The output-type restriction is integrated into `development` at merge commit
`76c8e915`, and migration `20260904000000` is applied to non-production staging
`llealjcaqvltrtdwwzrh`. Remote history, the exact four-value constraint,
unchanged two-row inventory/fingerprint, no-pending dry-run, linked types, full
pgTAP 171/171, workshop regression 18/18, TypeScript, focused ESLint, database
lint baseline, and rolled-back database-role authorization smoke all pass.

The post-integration hosted no-mutation Chrome smoke now passes through
`http://localhost:8080/asimov-hawks`: platform-admin sign-in, output list, exact
four-value selector, draft/current/archived presentation and locking,
ordinary-user and anonymous redirects, console, and network checks all passed.
No staging data was changed. The output-type staging gate is closed and
production remains unchanged.

The hosted smoke exposed a Tailwind v4 automatic source-discovery stall under
both Webpack and Turbopack. Branch `fix/tailwind-source-scan` limits discovery to
the application source directories; every tracked utility-bearing file is
covered. Normal `npm run dev` now compiles `/auth/login` in 10.5 seconds and
returns `200` through NGINX. TypeScript, focused ESLint, and whitespace checks
pass. This isolated fix is uncommitted and requires normal review/integration
before `feature/dataset-onboarding` is created from updated `development`.
Evidence is in `docs/output-types-staging-rollout-2026-09-10.md`.

Platform Admin Dataset Onboarding is implemented locally on
`feature/dataset-onboarding`. The protected two-step workflow previews and
atomically commits one canonical client, one existing active owner, one
existing active primary farm, and 1-100 normalized survey IDs. Shared private
database validation, platform-admin-only preview/commit RPCs, conflict checks,
confirmed ownership relationships, draft survey creation, compatibility
values, primary operator farms, organization requester links, and batch audit
evidence are included. Editing input invalidates preview; the UI shows inline
field conflicts, exact derived records, explicit confirmation, and per-survey
success links.

Clean local migration replay passes. Focused onboarding pgTAP passes 37/37,
the full 12-file suite passes 208/208, workshop regression passes 18/18, Next
route types, TypeScript, targeted ESLint, and authored-file whitespace checks
pass. Database lint reports only the known stale legacy backfill function. The
official local Supabase generator added both RPC contracts but omits the
tracked hosted PostgREST marker and emits an extra EOF blank line; no manual
generated-file edit was made. The user completed the signed-in local UI smoke:
new organization preview/commit, preview invalidation, created survey
links/details, existing private preview, duplicate/existing-ID and farm-owner
conflicts, inline errors, role redirects, console, and network checks all
passed. Evidence is in
`docs/dataset-onboarding-local-smoke-2026-09-11.md`.

Final branch review and the non-production staging rehearsal are complete.
Review tightened existing-survey conflicts to be case-insensitive and added a
guarded, verified owner-role containment procedure. Aggregate staging inventory
found no duplicate-ID or ownership conflicts, but staging has zero confirmed
farm-person relationships, so private onboarding must remain blocked there.
Only confirmed `owner` or `operator` farm relationships now qualify; confirmed
contacts and representatives fail closed. Staging has two qualifying
farm-organization relationships and zero qualifying farm-person relationships.
Fresh Auth/Public backups are checksummed, all 48 compared base-table counts
matched the isolated clone (excluding intentionally omitted managed Auth
migration history), migration/containment/reapply passed without data-fingerprint
change, clone pgTAP passed 37/37, and the linked dry-run lists only migration
`20260911000000`. Clean local replay and the full automated suite pass again.
Evidence is in
`docs/dataset-onboarding-staging-rehearsal-2026-09-14.md`.

Migration `20260911000000` is now applied to non-production staging after
explicit approval. Remote history contains exactly one row; the private
validator and both public RPCs exist, are owned by `postgres`, use
`SECURITY DEFINER` with empty search paths, and retain the intended privilege
boundary. The owner/operator eligibility rule is present, aggregate inventory
is unchanged, and the post-apply linked dry-run is clean. Linked staging type
generation restored the PostgREST 14.5 marker, retained both RPC contracts, and
passes TypeScript and whitespace. Dataset Onboarding is integrated into
`development` at `b35c50f5`. The user completed the post-merge no-mutation
smoke successfully and also observed that route compilation remains materially
faster after the Tailwind source-boundary fix. Production, Wave 3, MinIO,
assets, and onboarding records were not mutated.

The containment artifact was finalized after comparing hosted `postgres`
function ownership with the clone's `supabase_admin` ownership. It now verifies
the deployed owner dynamically. Unconfirmed and wrong-role clone runs fail
closed; owner execution and exact migration reapply preserve the relevant-row
fingerprint. Final containment SHA-256 is
`bd2e2f3a334ab65c20db51e593c2a3ccf43a440293a3217b2b348240271aa79c`.

The org-admin farm/survey table improvement is implemented and validated on
`feature/org-admin-tables`. Farm creation remains on the list page, confirmed
farms use a responsive table, and editing moved to
`/org-admin/farms/[farmId]` behind an explicit confirmed organization-link
check plus the existing audited RPC. Confirmed surveys use a responsive table
whose View Data action opens the existing authenticated, RLS-protected survey
route. No database or authorization contract changed. Next route types,
TypeScript, targeted ESLint, whitespace, and anonymous NGINX redirects pass.
The user-assisted authenticated smoke also passes farm edit/restore,
cross-organization denial, survey View Data/denial, responsive tables, role
boundaries, and browser console/network health.

The org-admin table slice is now integrated into `development` at
`49355d2e`, and its post-merge smoke passed. Survey Timeline was implemented
on `feature/survey-timeline`: normal routes load RLS-filtered dated
surveys through canonical primary `survey_farms` links, while User App Preview
first restricts relationships to the selected user's calculated survey IDs.
The responsive timeline shows Orthomosaic/3D availability, preserves surveys
with neither output, and navigates through existing routes with the viewer
provider keyed by survey ID so selection resets to Orthomosaic. Missing farm,
missing flight date, and current-only states are explicit. Route typegen,
TypeScript, targeted ESLint, whitespace, workshop regression 18/18, and
anonymous redirect smoke pass. The user confirmed the initial UI smoke behaves
correctly. The approved shadcn refinement now uses standard Card primitives,
stronger date/current hierarchy, concise icon-based output indicators,
scroll-snap desktop navigation, a clearer mobile summary, neutral empty-state
copy, and improved navigation/group semantics without changing functionality.
Post-refinement TypeScript, targeted ESLint, whitespace, and workshop regression
18/18 pass. The user then passed the complete responsive smoke with
representative primary-farm timeline data: normal and preview routes, desktop
and mobile navigation, ready/current-only/empty states, ordering and
availability, viewer reset, authorization boundaries, keyboard behavior, and
console/network health all behaved correctly. Evidence is in
`docs/survey-timeline-smoke-2026-09-17.md`. It is integrated into
`development` at `db137c74`. This smoke did not authorize staging
relationship changes; those remain a separate reviewed data gate.

The client-level Orthomap Survey dates filter was implemented on
`feature/orthomap-date-filter` and merged locally into `development` at
`5f941ce2`. Eligible current orthomosaics are grouped by
UTC flight date; All dates remains the reload default. The shared component
uses a desktop scroll-snap strip, mobile Select, static one-date summary, and
specific zero-eligible state. Raster, boundary, label, detection, FOI,
popup/event, loading, hover, and camera behavior all derive from the same
visible survey IDs without changing route props, server scope, RLS, storage,
or asset paths. Boundary/label GeoJSON is reactive while the MapLibre base
style remains stable. Next route type generation, TypeScript, targeted ESLint,
whitespace, workshop regression 18/18, login HTTP, and anonymous redirect
checks pass. Authenticated multi-date interaction smoke remains pending because
the current local dataset does not contain enough surveys for different flight
dates to exercise the filter meaningfully. Evidence and the deferred checklist
are in `docs/orthomap-date-filter-local-validation-2026-09-17.md`.

MinIO storage was relocated on 2026-09-22 to the approved 1 TB decimal dynamic
XFS VHDX on `D:`. The stopped source/destination inventories match, the
1,235,773-file content-tree SHA-256 is identical, the original ext4 backend is
retained at the dated rollback path, and the container still uses its pinned
image with restart policy `no`. The guarded helper passes real startup and
stop/start tests, verifies both capacity reserves and in-container XFS, and
fails closed for an absent configured VHDX. Wave 1-2 verification hashes,
counts, byte totals, and 14 authenticated object samples remain valid.

Cutover is operational but final acceptance is pending signed-in application
smoke, correction of the stale NGINX container healthcheck, confirmation that
direct MinIO ports and anonymous bucket listing are not externally exposed,
and a coordinated Windows/WSL/Docker restart test. With Next running,
anonymous protected tile, point-cloud, and malformed routes correctly return
401. Wave 3 remains paused; its
old config is stale and must be regenerated only after these checks and then
separately approved. Evidence is in
`docs/minio-storage-relocation-signoff-2026-09-22.md`.

The signed-in relocation smoke exposed two survey-viewer presentation issues,
now corrected locally on `fix/minio-host-capacity`: survey orthomosaics use
their available z11 tiles instead of disappearing below z15, and both survey
and client Orthomap views use the reachable standard OpenStreetMap raster
endpoint. The user confirmed the imagery, basemap, and zoom-out behavior.

The survey detail UI is now flattened into a lightweight timeline rail, plain
survey heading, and one bordered viewer surface with its controls attached.
Timeline data, normal and preview routing, authorization, map/3D behavior, and
asset contracts are unchanged. Focused ESLint has zero errors (37 existing map
warnings), TypeScript and whitespace checks pass, and local login/anonymous
redirect smoke passes. The user passed the complete authenticated responsive
smoke checklist for the flattened workspace on normal and User App Preview
routes. A final single-survey polish now uses a compact `text-xs` date and a
responsive separator between the date and survey details; only this focused
visual recheck remained and now passes on desktop, mobile/tablet, normal and
User App Preview routes, with multi-survey navigation unchanged and no new
console/network errors. Post-polish TypeScript, PowerShell parsing, whitespace,
and workshop regression 21/21 pass. Targeted ESLint has zero errors; its 54
warnings are the existing 17 Orthomap and 37 survey-map warnings.

On 2026-09-23 an uncontrolled Windows/WSL/Docker restart resumed MinIO against
the empty underlying Ubuntu ext4 directory while the XFS VHDX was detached.
MinIO was stopped, the intact XFS UUID was remounted, its stale Docker Desktop
bridge was cleared, and only the MinIO Compose service was recreated from its
authoritative configuration with restart policy `no`. Recovery verification
passes: healthy container, in-container XFS, five buckets, HTTP 200 health,
and an HTTP 200 representative `AH-0260001` tile. The helper now starts the
required Hyper-V service, handles a detached UUID correctly, and immediately
stops any already-running non-XFS MinIO. The planned coordinated restart test
and final storage/security acceptance remain pending; Wave 3 stays paused. The
machine-local Compose `minio` service now also declares restart policy `no`,
matching the live container and manual-start contract. The coordinated test is
deferred until the active `AH-026095` pipeline run and WebODM processing finish.

The coordinated Windows/WSL/Docker restart test then ran after `AH-026095` was
paused and WebODM was stopped. MinIO correctly stayed stopped, but guarded
startup detected the recurring stale Docker Desktop ext4 bind bridge and
stopped MinIO; restart acceptance therefore failed. Recovery mounted the
intact XFS UUID, removed only the stopped MinIO definition and its verified
stale bridge, recreated only the service, and passed guarded startup. MinIO is
healthy on XFS with restart `no`; all five buckets, representative tile and
point cloud, capacity checks, and anonymous protected-route denials pass. The
helper's Windows PowerShell default-config path was corrected and the exact
elevated npm startup command passes idempotently. Signed-in post-recovery
Survey/Orthomap browser confirmation remains pending because browser control
did not reconnect. Wave 3 remains blocked pending stronger mount ordering,
NGINX health, and direct-port containment.

Stronger mount ordering is now implemented and repeat restart storage
acceptance passes. Docker Desktop sign-in startup and its Windows Run entry are
disabled; MinIO remains restart `no`. The elevated
`npm run minio-storage:start` command attaches and validates the exact XFS
VHDX before Docker/MinIO creation, verifies both Docker clients, and recognizes
only the exact retained Docker XFS bridge on idempotent runs. The accepted cold
start produced a healthy pinned-image MinIO container with `/data` on XFS, all
five buckets, HTTP 200 health, the 766-byte representative tile, and the
58,328,382-byte point cloud. Workshop regression is 21/21; PowerShell/JSON and
whitespace checks pass. The user passed final signed-in Survey, 3D, Orthomap,
authorized/cross-scope, five-bucket, and clean console/network smoke. Storage
restart acceptance is complete. WebODM, `AH-026095`, and Wave 3 remain stopped;
the user will run and monitor any later approved Wave 3 upload.

NGINX and MinIO edge hardening is implemented on the separate stacked branch
`fix/minio-edge-hardening`. The machine-local NGINX healthcheck now uses
`127.0.0.1` and is healthy. MinIO publishes 9000/9001 only on
`127.0.0.1`; the host LAN address cannot connect. Anonymous ListBucket is
denied for `tiles` and `pointclouds`, while exact GetObject remains available
only through loopback/internal Docker networking so the existing unsigned
NGINX upstream can serve assets after `auth_request`. Anonymous protected
NGINX tile and point-cloud requests still return 401. The startup helper now
requires exactly one configured loopback binding per port and passes a true
idempotent rerun without changing container identity or start time. MinIO is
healthy on XFS with five buckets and verified representative tile/point-cloud
objects; WebODM remains stopped. TypeScript, workshop regression 21/21,
PowerShell/JSON parsing, Compose validation, and whitespace pass. The user
passed the final signed-in post-hardening smoke: Survey orthomosaic, 3D point
cloud, BARBCO2026 Orthomap, authorized access, cross-scope denial, and clean
console/network behavior. NGINX/MinIO edge-hardening acceptance is complete.
Wave 3 remains stopped and requires regenerated configuration, review, freeze,
and separate upload approval; the user will run and monitor that upload.

Both storage branches are merged into `development`. Wave 3 preparation then
started from a clean tree with the historical reviewed checksum still matching
`374734d07c67b7a5bcf48c7c924f7b958e51064127cda764139c64e59caa932c`
and its historical state still zero bytes. Two read-only preparation attempts
failed safely while traversing different Z-drive tile directories: Windows and
Node temporarily reported the directory absent, then both could enumerate it
again about a minute later. No refresh output, upload, frozen config, manifest,
database change, or Git change was produced by either attempt.

Branch `fix/workshop-share-retries` adds visible bounded backoff for transient
directory-read and file-stat errors, including `UNKNOWN` and temporary
`ENOENT`, for a maximum approximately 60-second retry window. Persistent
transient errors and all non-transient errors remain fail closed. Workshop
regression passes 24/24; targeted ESLint, TypeScript, and whitespace pass. The
code is uncommitted and needs one live preparation run from the user's normal
PowerShell because the elevated agent context cannot inherit mapped `Z:`.
WebODM is stopped; MinIO remains healthy with restart `no` and `/data` on XFS.

## 2026-09-25 workshop asset verification completion

The user completed all five organization waves and all six private waves. The
11 verification reports cover the exact 30-survey staging/2026 expected set:
13 organization surveys plus 17 private surveys, with no missing, unexpected,
or cross-report duplicate survey and no denied capacity check. Combined totals
are 1,944,728 objects and 109,695,980,633 bytes. The supported runner is
stopped after Private Wave 006, its process has exited, and its stderr is empty.

`npm run workshop-assets:manifest` generated the local review-only combined
draft and JSON inventory with 41 artifact entries. The SQL SHA-256 is
`f56db2d90a276d3ab7b2f70095f1be390f737a4b3fc063f6bbfc44429091dd36`;
the JSON SHA-256 is
`581afc0b858c5eb9760594926e9240c1e984542877359d2f17775ae84999c313`.
The draft contains only two inserts, retains manifest ID/key placeholders, and
has not been applied, approved, activated, or used to supersede staging.

The filesystem retry suite passes 24/24. Branch
`fix/workshop-share-retries` is committed/pushed as `92dabf5a`.

Branch `ops/workshop-manifest-rollout` now contains a tested rollout packager
and evidence. It pins replacement `manifest-2026-09-25` with ID
`b07905c4-71ae-4df6-a834-14fbbae13552` to active predecessor
`manifest-2026-08-11`. The ignored package and ACL-complete staging backup
are checksummed. All 53 Auth/Public table counts matched in the isolated
restore; draft apply/verify, containment/reapply, reviewed/atomic cutover,
active verification, forward recovery, and missing-confirmation denial pass.
Backup alias/timestamp fields intentionally remain null. No staging row was
changed. Next: review/commit this branch and obtain explicit approval before
applying only the inactive staging draft.
See `docs/workshop-asset-migration-completion-2026-09-25.md`.
