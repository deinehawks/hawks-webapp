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
6. Protected org-admin context, post-login routing, sidebar/layout, RPC-only
   actions, and seven portal sections are implemented locally. Surveys are
   read-only and Outputs are platform-admin-only.
7. TypeScript, targeted ESLint, full pgTAP (142/142), and whitespace checks
   pass.

Next sequence:

1. Manually smoke the portal as platform admin, org admin, ordinary member,
   suspended/removed member, and cross-organization user, including every
   permitted mutation and prohibited boundary.
2. Fix any smoke regression locally and rerun TypeScript, targeted ESLint,
   full pgTAP, and whitespace checks.
3. After the smoke gate passes, prepare org-admin migration
   inventory, backup/recovery rehearsal, rollback/containment notes, and staging
   smoke gate. Do not change production.
4. Follow with `feature/survey-contract`, `feature/user-app-preview`, and
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
