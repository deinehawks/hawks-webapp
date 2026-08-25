# Active Context

Last updated: 2026-08-25

Current epic: Survey identity and client-field contract.

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
8. Both org-admin migrations passed staging inventory, backup/restore,
   containment, dry-run, apply, history, contract, type, and automated test
   gates on `llealjcaqvltrtdwwzrh`.
9. User-assisted authenticated staging smoke passed for the complete org-admin
   portal and authorization boundaries.
10. The platform-admin onboarding review queue is implemented and its
    single-migration staging gate passed on `llealjcaqvltrtdwwzrh`, including
    backup/restore, containment replay, remote contract/history verification,
    linked types, and the full 153/153 pgTAP suite.
11. User-assisted authenticated staging smoke passed for org-admin onboarding
    submission and platform-admin review; the org-admin phase is complete.
12. `feature/org-admin` is pushed and merged into `development`; the new
    `feature/survey-contract` branch starts from that integration tip.
13. The first compatibility-safe survey update contract is implemented locally,
    with generated contracts and focused/full validation passing.
14. The checksummed backup/restore, migration/containment, one-file staging
    apply, remote contract/history, linked types, automated suite, and
    rolled-back database-role authorization smoke gates pass.
15. Signed-in survey-contract staging smoke passed against deployment
    `dcad51f2`; the update was restored and all access and compatibility checks
    held.

Next sequence:

1. Complete `feature/org-admin-navigation`: active organization admins land on
   `/dashboard` and receive a role-aware dropdown for the seven existing
   protected `/org-admin` pages.
2. Follow with `feature/user-app-preview` and `fix/output-types` as separate
   branches.

Constraints:

- RLS and server-side authorization remain authoritative.
- Org-admin mutations use narrow audited RPCs; do not restore broad update
  policies.
- Org admins may promote an active ordinary member but cannot alter any
  org-admin membership, including their own.
- The strict org-admin context assumes the workshop rule of exactly one active
  org-admin organization membership.
- Navigation visibility never replaces the strict org-admin context, server
  checks, or RLS, and does not expose Outputs or survey mutations.
- Survey identity/client contraction and global output-type migration remain
  separate slices.
