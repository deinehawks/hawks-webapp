# Current State

Last updated: 2026-08-24

Current branch: `feature/org-admin`.

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
