# Session Handoff

Last updated: 2026-08-24

Branch: `feature/org-admin`.

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

Not completed:

- Authenticated browser smoke of the new portal and its mutations remains
  pending. The existing port-3000 Next process timed out during the bounded
  anonymous route check; a second dev process could not share `.next/trace`.
- The org-admin migration has not received its staging inventory, backup/restore
  rehearsal, rollback package, staging apply, or role smoke.

Next action: manually smoke all org-admin routes, permitted mutations, and
prohibited role/cross-organization boundaries. Fix regressions before preparing
the non-production staging rollout. Do not mutate production.

Preserve unrelated user-owned scratch/deletion state in `.tmp/`, `issues.txt`,
`workflow.txt`, and `improve.txt`.
