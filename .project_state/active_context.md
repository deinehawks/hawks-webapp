# Active Context

Last updated: 2026-09-23

Current epic: Close MinIO workshop storage and exposure gates before Wave 3.

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
30. The output-type restriction is integrated into `development` at
    `76c8e915`. Its local replay, staging backup/rehearsal/apply, remote
    contract, automated regression, rolled-back authorization smoke, and
    local-application-to-staging smoke pass. The user also passed the hosted
    no-mutation Chrome smoke for sign-in, output list, exact four-value
    selector, draft/current/archived presentation, denied-role redirects,
    console, and network health. The output-type staging gate is closed.
31. Hosted smoke exposed Tailwind automatic source discovery blocking route
    compilation under both Webpack and Turbopack. `fix/tailwind-source-scan`
    explicitly limits discovery to application source directories and covers
    every tracked utility-bearing file. Normal `npm run dev` now compiles
    `/auth/login` in 10.5 seconds and returns `200` through NGINX. TypeScript,
    focused ESLint, and whitespace checks pass. The fix is uncommitted and
    pending normal integration.
32. The Tailwind source-boundary fix is integrated into `development` at
    `6653aa45`. `feature/dataset-onboarding` now implements the approved
    platform-admin two-step UI and narrow preview/commit RPC contract. Clean
    replay, focused pgTAP 37/37, full pgTAP 208/208, workshop tests 18/18,
    route types, TypeScript, and targeted ESLint pass. Database lint has only
    the known stale backfill finding.
33. The user passed the full signed-in local Dataset Onboarding smoke against
    127.0.0.1:54321: organization preview/commit, preview invalidation,
    created survey links, private preview, all three blocking conflicts,
    inline errors, authorization redirects, console, and network checks.
34. Final branch review and staging rehearsal pass. Existing survey conflicts
    are now case-insensitive. A fresh checksummed staging backup restored into
    an isolated clone with all 48 compared base tables matching, the guarded
    containment and exact reapply preserved the relevant-row fingerprint, clone
    pgTAP passed 37/37, and the linked dry-run lists only migration
    `20260911000000`. Only confirmed owner/operator farm relationships qualify;
    staging has two qualifying organization relationships and zero qualifying
    person relationships, so private onboarding cannot yet succeed there.
35. After explicit approval, migration `20260911000000` was applied to
    non-production staging. Remote history, function ownership/security/search
    paths, RPC privileges, owner/operator rule, aggregate inventory, and
    no-pending linked dry-run pass. Linked types restored the hosted PostgREST
    marker and retain both RPC contracts; TypeScript and whitespace pass.
36. The guarded containment artifact now verifies actual deployed function
    ownership dynamically because staging uses `postgres` while the clone uses
    `supabase_admin`. Missing-confirmation and wrong-role runs fail closed; the
    owner containment/reapply cycle preserves the data fingerprint.
37. Dataset Onboarding is merged into `development` at `b35c50f5`; the user
    passed the post-merge no-mutation smoke and confirmed route compilation
    remains much faster after the Tailwind source-boundary fix.
38. `feature/org-admin-tables` replaces repeated farm/survey cards with
    responsive tables, keeps farm creation, moves farm editing to an explicitly
    organization-scoped detail route, and links survey View Data through the
    existing authenticated/RLS-protected route. Static checks, anonymous
    redirects, and the full user-assisted authenticated/responsive smoke pass.
39. The org-admin table slice is integrated into `development` at
    `49355d2e` and its post-merge smoke passed. `feature/survey-timeline`
    implements the RLS-scoped normal timeline, selected-user-scoped preview
    timeline, responsive date navigation, explicit empty/current-only states,
    output availability, and survey-keyed viewer reset. Route typegen,
    TypeScript, targeted ESLint, whitespace, workshop regression 18/18, and
    anonymous redirect smoke pass. The user confirmed the initial UI smoke.
    The approved shadcn visual refinement adds standard Card composition,
    stronger date/current hierarchy, concise output indicators, scroll snapping,
    clearer mobile selection context, and tailored empty states. Post-refinement
    TypeScript, targeted ESLint, whitespace, and workshop regression 18/18 pass.
    The user then passed the complete post-refinement responsive smoke across
    normal and User App Preview routes, representative timeline states,
    navigation/viewer reset, authorization boundaries, keyboard behavior, and
    console/network health. Evidence is in
    `docs/survey-timeline-smoke-2026-09-17.md`. It is integrated into
    `development` at `db137c74`.
40. `feature/orthomap-date-filter` implements the approved shared Orthomap
    filter. It preserves All dates, derives eligible current orthomosaics from
    already-authorized surveys, and consistently filters rasters, boundaries,
    labels, detections, FOI counts/layers, events, and popups. The MapLibre base
    style remains stable and the camera refits to boundary or finite extent
    bounds. Route typegen, TypeScript, targeted ESLint, whitespace, workshop
    regression 18/18, login HTTP, and anonymous redirect checks pass. No
    database, RLS, route, storage, asset-path, or server-scope contract changed.
    It is merged locally into `development` at `5f941ce2`. Authenticated
    multi-date interaction smoke is still pending until representative surveys
    with different flight dates are available; evidence is in
    `docs/orthomap-date-filter-local-validation-2026-09-17.md`.

Next sequence:

1. When representative multi-date survey data is available, complete
   authenticated responsive smoke for All dates and date switching on normal
   Orthomap and User App Preview, including zero/one/multiple-date states,
   scope boundaries, camera, popups, keyboard, console, and network.
2. If smoke later finds an issue, correct it on a focused branch and rerun the
   affected static/regression gates.
3. Push or deploy the locally merged `development` only through the normal
   reviewed workflow; no push or deployment was performed in this session.
4. Keep Wave 3 paused pending the dedicated 4 TB MinIO drive decision. Preserve
   the frozen checksum and zero-byte recovery state; do not regenerate, upload,
   relocate storage, or build a manifest.
5. After the storage decision, use a separate infrastructure plan for MinIO
   relocation or an explicitly approved Wave 3 resume. Keep later survey
   timeline follow-ups separate from infrastructure work.

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

## 2026-09-22 MinIO relocation override

The earlier next-sequence items that kept relocation pending a drive decision
are superseded. The approved 1 TB decimal dynamic XFS VHDX cutover on `D:` is
operational, the ext4 source is preserved as rollback, and MinIO starts only
through the guarded helper with automatic restart disabled. Content-tree,
Wave 1-2 evidence, authenticated object samples, service restart, capacity, and
absent-VHD fail-closed checks pass.

Next sequence:

1. Recheck the compact single-survey date and responsive divider on desktop,
   tablet, mobile, and User App Preview. The preceding full authenticated UI
   smoke and this final refinement now pass.
2. Correct the NGINX container's failing localhost health probe and explicitly
   contain the direct MinIO 9000/9001 all-interface plus anonymous-listing
   exposure before external acceptance. Anonymous protected routes correctly
   return 401 when the Next auth upstream is running.
3. After `AH-026095` and WebODM finish, schedule the coordinated
   Windows/WSL/Docker restart and recovery test and obtain explicit approval
   immediately before restarting Windows.
4. Only after acceptance, regenerate/review/freeze Wave 3 for `AH-026023`,
   `AH-026024`, and `AH-026028`; obtain separate upload approval before running
   one uploader. Do not activate a partial manifest or delete rollback data.

The relocation application smoke also produced a focused survey-viewer UI
follow-up on the current branch. Tile zoom coverage and the OSM endpoint are
fixed and user-confirmed. The card-heavy detail layout is now a flatter survey
workspace: compact timeline rail, plain heading, and a single bordered viewer
with an attached toolbar. Preserve timeline grouping, normal/preview links,
RLS, asset authorization, and map/3D behavior. The complete authenticated
desktop/tablet/mobile smoke passed. A compact `text-xs` date plus vertical
desktop/horizontal mobile separator is implemented only for the single-survey
row and needs one focused visual recheck; multi-survey behavior is unchanged.

On 2026-09-23 MinIO was recovered from an uncontrolled restart that exposed
the empty ext4 directory beneath the detached XFS mount. It is healthy on XFS
again with all five buckets and the representative tile verified. Preserve the
new early non-XFS stop, detached-device attach, and Hyper-V service handling in
the startup helper. The machine-local Compose service now also pins restart
policy `no`, consistent with the live container and guarded manual startup.
Treat restart ordering as unresolved until a deliberately coordinated
Windows/WSL/Docker test passes after active `AH-026095` and WebODM work is
finished; do not begin Wave 3.

The coordinated restart was executed after the pipeline was paused and WebODM
was stopped. MinIO did not auto-start, but the stale Docker Desktop ext4 bridge
recurred during guarded startup, so acceptance failed as designed. The helper
stopped MinIO and recovery succeeded by mounting the intact XFS UUID, clearing
only the verified stale bridge, recreating only MinIO, and rerunning the guard.
Five buckets, health, capacity, representative tile/point-cloud access, and
anonymous denial paths pass. Default config resolution in the PowerShell
helper is fixed and the exact npm startup command is idempotent. Next, manually
confirm signed-in Survey/Orthomap rendering and console/network health, then
design stronger mount-order orchestration. Keep Wave 3 blocked; the user will
run and monitor any later approved upload themselves.

## 2026-09-23 stronger mount-ordering result

The preceding failed restart is superseded for storage ordering by the repeat
accepted cold start. Docker Desktop auto-start and its Windows Run entry are
disabled. The elevated npm helper owns XFS attach/mount, Docker startup, MinIO
recreation, exact retained-XFS bridge validation, both reserves, buckets,
health, and representative assets. MinIO is healthy on the pinned image with
restart `no`, `/data` on XFS, five buckets, and matching tile/point-cloud bytes.
WebODM, `AH-026095`, and Wave 3 remain stopped.

Next sequence:

1. Correct the NGINX internal health probe and contain direct MinIO 9000/9001
   access plus anonymous bucket listing before external acceptance.
2. Only after those gates pass, regenerate/review/freeze the same Wave 3 scope
   and obtain separate approval. The user, not Codex, will run and monitor the
   upload. Do not activate a partial manifest or delete rollback data.

The user passed the final signed-in post-restart Survey, 3D, Orthomap,
authorized/cross-scope, five-bucket, and clean console/network smoke. The NGINX
failure is now isolated to `localhost` resolving to IPv6 `::1`; IPv4
`127.0.0.1/health` succeeds. MinIO 9000/9001 still bind all host interfaces and
anonymous `tiles` listing still returns 200.
