# Active Context

Last updated: 2026-09-03

Current epic: Workshop capacity policy while Wave 3 remains paused.

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
16. The user-tested org-admin navigation slice is integrated into
    `development` at `0739e44c`.
17. The workshop batch branch contains private-allowlist preparation, staging
    and capacity gates, reviewed streaming uploads, a single hidden runner,
    verification output, tests, and the operator runbook.
18. The populated allowlist's 31-selection dry run completed. `AH-026012`
    and `AH-026013` are ready; 29 selections lack exact staging survey rows,
    and `AH-026038` also has empty tile variants. No wave, upload, or external
    mutation ran.
19. `AH-026038` is confirmed unfinished and will be removed. The resulting
    30-survey batch contains 17 individual-client and 13 organization-client
    surveys; 28 survey identities require a reviewed staging onboarding
    transaction because the Platform Admin UI cannot create clients, surveys,
    or batch records.
20. Read-only staging inventory found two new individual client codes, one
    existing individual client without a person mapping, one unclassified
    organization client without a canonical mapping, and two correctly mapped
    organization clients. No onboarding mutation ran.
21. The checksummed staging backup and isolated restore/rehearsal gate passed.
    The exact authorization migration and both onboarding transaction forms
    validated in a disposable clone; focused clone authorization passed 16/16
    and the clean local full suite passed 170/170.
22. The approved authorization migration and onboarding transaction are now
    applied to staging. All 30 records and scope relationships verify, BSBG is
    organization/cooperative, no account or grant counts changed, and the
    organization asset preparation reports all 13 surveys ready.
23. Organization Wave 1 (`AH-026012` and `AH-026013`) is reviewed, frozen,
    uploaded, fully verified, and signed off in staging. The checksum, 37,868
    objects, four capacity checks, and four protected manifest entries passed.
    No manifest was activated.
24. The workshop runtime is upgraded through NVM to Node.js 22.22.0. The
    repository engine, `.nvmrc`, lockfile, and Node type definitions are
    aligned; AWS SDK imports, focused tests 18/18, targeted ESLint, and
    TypeScript pass.
25. Organization Wave 2 is reviewed, frozen, uploaded, fully verified, and
    signed off in staging. All 383,975 objects and 24,142,306,973 bytes passed
    object and group checks; five capacity checks and five organization-
    protected manifest entries passed. The runner stopped cleanly and no
    manifest was activated.
26. Organization Wave 3 is frozen for `AH-026023`, `AH-026024`, and
    `AH-026028`. Its approved staging run stopped on local `ENOSPC` and
    produced no sign-off. Atomic JSON writes and zero-byte state recovery are
    implemented and tested; the exact frozen config can resume after local
    disk space is freed.
27. Read-only User App Preview is integrated into `development` at
    `2a359188` with a dedicated full-screen user-style
    sidebar, target-scoped dashboard/survey/orthomap/detection data,
    multi-client navigation, and explicit empty states. Static checks, full
    pgTAP 170/170, workshop tests 18/18, and anonymous redirect smoke pass.
28. The user passed authenticated User App Preview smoke: the Admin sidebar is
    replaced, user-style navigation works, and Exit Preview returns to the
    selected user's Admin record.
29. The workshop capacity policy is integrated into `development` at
    `3e1dd8bd`: retain the larger of 5% or 20 GiB after 10% transfer
    overhead. New freeze and publish validation rejects stale policy metadata;
    focused tests pass 18/18.

Next sequence:

1. Raise physical `C:` free space from 80.70 GiB to at least 95 GiB while
   preserving the ignored Wave 3 config, runner evidence, and state path.
2. Start MinIO through the approved infrastructure workflow and verify it is
   healthy with sufficient logical and physical capacity.
3. Regenerate the equivalent Wave 3 config under the new policy, review its
   scope and checksum, and freeze it without uploading.
4. After fresh explicit approval, resume Wave 3 from the verified remote
   objects, then
   fully verify and sign it off.
5. Proceed through the remaining organization waves with separate review,
   freeze, approval, upload, and sign-off gates.
6. Complete organization uploads while private waves are prepared; approve one
   combined manifest draft only after every expected survey verifies.
7. Follow User App Preview sign-off with `fix/output-types`.

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
- Private asset support requires canonical people mappings, a null organization
  scope, explicit protection-level enforcement, and eventual explicit grants;
  never fabricate one-person organizations. No-organization account/dashboard
  support remains deferred.
- Docker Desktop container capacity is not sufficient evidence by itself.
  Apply the same reserve policy to the physical host drive storing its data VHD.
