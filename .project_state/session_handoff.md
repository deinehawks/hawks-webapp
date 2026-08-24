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

Not completed:

- No `/org-admin` layout, pages, application context, or server actions exist.
- TypeScript/lint/full combined pgTAP have not been rerun after the latest
  generated-type refresh.
- The org-admin migration has not received its staging inventory, backup/restore
  rehearsal, rollback package, staging apply, or role smoke.

Next action: implement the protected org-admin context/layout and RPC-only server
actions, then build the portal pages. Validate locally before preparing any
staging rollout. Do not mutate production.

Preserve unrelated user-owned scratch/deletion state in `.tmp/`, `issues.txt`,
`workflow.txt`, and `improve.txt`.
