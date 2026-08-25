# Current State

Last updated: 2026-08-25

Current branch: `feature/org-admin-navigation`, based on `development` at
`dcad51f2`.

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

The org-admin dashboard navigation correction is implemented locally on
`feature/org-admin-navigation`: active organization admins land on the normal
`/dashboard` experience and access the seven existing protected `/org-admin`
destinations through a reusable dropdown. A shared server resolver exposes
navigation only for exactly one active org-admin membership in an active
organization; ambiguous, inactive, and absent access remain fail-closed. The
normal application sidebar is reused by both route trees, so Orthomap and Survey
Data remain visible while moving through organization-management pages. The
strict portal context, RLS, survey read-only scope, and prohibition on Outputs
are unchanged. TypeScript, targeted ESLint, and whitespace checks pass;
deployment and authenticated responsive smoke remain pending.
