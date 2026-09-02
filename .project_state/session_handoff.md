# Session Handoff

Last updated: 2026-09-02

Current branch: `development`. User App Preview merge: `2a359188`.

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
