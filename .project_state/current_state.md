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
  ordinary-member status changes and promotion, farm creation/editing,
  survey/output metadata edits, and organization-scoped grant lifecycle.
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

The `/org-admin` layout, pages, and server actions have not been implemented.
The org-admin migration has not been inventoried, recovery-rehearsed, or applied
to staging. No production mutation was performed.
