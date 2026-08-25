# Session Handoff

Last updated: 2026-08-25

Current branch: `feature/workshop-asset-batches`, based on `development` at
`0739e44c`.

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
allowlist starts empty, so its validated dry run created no jobs, staging query,
or upload. `AH-026012` and `AH-026013` fail closed. Preparation discovers
direct/nested `Z:\surveys\2026` layouts, blocks unreviewed PCDs and missing
canonical staging mappings, groups at most three surveys, and checks MinIO
capacity. Reviewed configs are SHA-256 frozen before the single hidden runner
can stream, resume, and verify uploads. Manifest SQL is generated only after
verification and never runs automatically. Focused tests and static checks
pass. Production and database state are unchanged.

Preserve unrelated user-owned scratch/deletion state in `.tmp/`, `issues.txt`,
`workflow.txt`, and `improve.txt`.
