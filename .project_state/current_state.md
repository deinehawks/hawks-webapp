# Current State

Last updated: 2026-09-02

Current branch: `feature/user-app-preview`, based on `development` at
`65cd9017`.

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
