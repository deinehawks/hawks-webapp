# Active Context

Last updated: 2026-09-10

Current epic: Survey output-type restriction while Wave 3 is deferred.

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
30. The output-type restriction is implemented locally on
    `fix/output-types`: four shared allowed values, controlled Admin
    selectors, matching server validation, fail-closed historical
    normalization with metadata preservation, aggregate verification,
    containment SQL, and updated pgTAP fixtures. Static non-Docker validation
    passes. User-reported authenticated UI smoke passes. Clean reset/replay,
    focused pgTAP 21/21, full pgTAP 171/171, workshop regression 18/18, local
    DB lint with only the known stale backfill finding, route type generation,
    TypeScript, focused ESLint, and whitespace validation pass. Fresh
    checksummed staging backups restore with all 27 compared counts matching;
    exact migration/containment/reapply, focused clone pgTAP 21/21, and a
    one-file linked dry-run pass. The approved one-file staging apply, remote
    history/constraint/inventory/no-pending checks, linked type comparison,
    full automated suite, and rolled-back database-role smoke now pass. The
    user also passed the signed-in local-application-to-staging Chrome smoke,
    including restored mutation and denied-role checks. The branch is ready for
    integration; hosted staging deployment smoke remains open.

Next sequence:

1. Integrate and deploy `fix/output-types` to hosted staging, then run a short
   no-mutation deployment smoke for sign-in, selector/lock/current presentation,
   denied-role redirects, and console/network health. Do not apply anything to
   production.
2. After the output-type staging gate, return to Wave 3 through a separately
   approved infrastructure session: stop Docker/WSL cleanly, compact the
   Ubuntu VHDX, and raise physical `C:` free space from 73.10 GiB to at least
   95 GiB while preserving frozen evidence and recovery state.
3. Start or retain MinIO through the approved infrastructure workflow, verify
   capacity,
   regenerate/review/freeze the equivalent Wave 3 config under the new policy,
   and obtain fresh explicit approval before upload.
4. After Wave 3 sign-off, implement `feature/dataset-onboarding`, including
   reliable primary-farm assignment so newly onboarded surveys can participate
   in chronological navigation. The current Wave 3 is not blocked by this UI
   because its staging records already came from the reviewed one-off
   onboarding transaction.
5. Begin the frontend work on separate branches: implement
   `feature/survey-timeline` first, followed by `feature/org-admin-tables`.
   Do not mix either slice into the migration, output-type, or onboarding
   branch.

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
- Timeline entries are independently identified surveys sharing the same
  primary `survey_farms` relationship and are ordered by
  `surveys.flight_date`. Normal routes must remain RLS-scoped; User App Preview
  must filter entries through the selected user's calculated effective scope.
- The first timeline release switches between dated survey orthomosaics and
  point clouds. It does not group survey IDs, add a processing-date column,
  version detections, or provide side-by-side comparison.
