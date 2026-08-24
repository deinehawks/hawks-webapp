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

The org-admin migration has not been inventoried, recovery-rehearsed, or applied
to staging. Authenticated browser smoke is still required; the existing local
Next process did not respond to the bounded route check, while a second process
could not share `.next/trace`. No production mutation was performed.
