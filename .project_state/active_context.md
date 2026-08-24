# Active Context

Last updated: 2026-08-24

Current epic: Admin and Organization Access Model v2.

Completed:

1. Access Policy v2 and user-first signup are implemented in staging.
2. Full user-assisted staging authorization and signup smoke passed.
3. Branch `feature/org-admin` is active.
4. Local org-admin database/RPC foundation and 16 focused pgTAP assertions are
   implemented and passing.
5. Generated database types include the new org-admin RPC contracts.

Next sequence:

1. Implement the protected `/org-admin` layout and server-side active
   org-admin context.
2. Add server actions that call only the narrow RPCs, then build overview,
   organization, members, onboarding requests, grants, farms, surveys, and
   outputs pages.
3. Run TypeScript, targeted ESLint, full pgTAP, authorization smoke, and
   whitespace checks.
4. Only after the application slice passes: prepare org-admin migration
   inventory, backup/recovery rehearsal, rollback/containment notes, and staging
   smoke gate. Do not change production.
5. Follow with `feature/survey-contract`, `feature/user-app-preview`, and
   `fix/output-types` as separate branches.

Constraints:

- RLS and server-side authorization remain authoritative.
- Org-admin mutations use narrow audited RPCs; do not restore broad update
  policies.
- Org admins may promote an active ordinary member but cannot alter any
  org-admin membership, including their own.
- The strict org-admin context assumes the workshop rule of exactly one active
  org-admin organization membership.
- Survey identity/client contraction and global output-type migration remain
  separate slices.
