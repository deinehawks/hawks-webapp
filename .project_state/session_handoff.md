# Session handoff
Last updated: 2026-10-05.

The approved dynamic-reader change is complete locally. V2 now calls
`list_authorized_published_survey_assets()`, queries only the returned survey
IDs through normal RLS, and validates client code, route, tile metadata, exact
current specialized artifact and the 5 GiB PCD limit. Its static
`.recording/selection.json`, catalog and binding files are retained only as
historical evidence. The platform-admin checklist also uses the dynamic
published set. Protected paths support explicit years 2000-2100 and verified
safe PCD filenames. Tests pass 30/30; full TypeScript has only the known legacy
UI diagnostics and none in the new adapter/auth files.

Do not test the dynamic checkout against staging yet: the required V3 migration
has not been remotely applied. Next complete the V3 backup/isolated
rehearsal/approval gate, then restart V2 and run member/admin/denial/tile/PCD
smoke through 127.0.0.1:8082.

Historical recovery note: on 2026-10-05 the temporary AH-0260001/demo-client screencast bypass was
surgically reverted. AH-026070 and the verified 58-survey selection/catalog
are restored, the normal RLS-filtered loader is active, tests pass 29/29, and
V2 is healthy through 127.0.0.1:8082. For the remaining four-survey UEMPC
issue, verify the active membership is Member rather than Organization admin,
then confirm V3 Access Preview reports only AH-026032. Do not conceal an
incorrect staging authorization state with another V2-only filter.

Work in this V2 repository, not the original V3 migration checkout.
Branch fix/v2-recording-compat, baseline 8e0e157c; nothing committed or pushed.
Read RECORDING-SETUP.md before starting services.

Configuration already ran successfully; do not rerun it over existing files.
.env.local and .recording are ignored. No service-role/DB/MinIO secret copied.
Sparse checkout excludes public/tiles and public/3d; .git still contains
historical assets. Git object storage is independent, not a shared worktree.

Migration finished and all 21 saved reports passed the catalog audit.
.recording/catalog.json already exists; builder intentionally refuses overwrite.
Audit accepts empty stderr plus only the checksummed, previously signed-off
Wave 001 Node-version warning; details in RECORDING-SETUP.md.

Own npm ci completed; 29/29 tests, Next route typegen and production build pass.
Build still skips type/lint validation under inherited next.config.ts settings.
Standalone tsc fails in legacy UI; classification against baseline is pending.
npm run lint fails on the existing invalid "prefer const" rule. The V2 dev
server and isolated proxy are currently listening on ports 3200 and 8082.
The dev server was restarted after a concurrent production build invalidated
its `.next` asset references; CSS and login JavaScript now return 200 through
port 8082. Stop dev before future builds or restart it after building.

Exact PCD binding is implemented and generated from V3's checksummed reviewed
metadata. V2 requires matching surveys.point_cloud pointer, is_current row code,
and bound verified URL. The generated file contains 11 bindings: two preserve
existing output identities (AH-026012/AH-026013), nine describe future rows.
It does not change either existing row/count/pointer. Local binding runtime
validation passes. No Supabase, MinIO, NGINX or V3 mutation occurred.

Current staging inventory: 58 survey rows with current orthos, 11 with current
PCD rows and 56 missing survey dates.
The final checksummed r4 staging package is in V3 at
.tmp/workshop-assets/cumulative-20261002-r4/package. Fresh backup and isolated
rehearsal passed; the exact approved hash was then applied to staging and
post-apply verification passed. Unknown dates remain null and
AH-026012/AH-026013 remain unchanged. The new 77-entry manifest is reviewed and
active after separately approved audited transitions. Do not activate the old
draft with incorrect private MCS protection.

The V2 PCD admission gate is 5 GiB and is covered by focused tests. Proxy and
browser gates remain; smoke multi-GiB files individually because browser
memory/GPU behavior can fail below the application limit.

The isolated hawks-v2-recording-nginx container is healthy and bound only to
127.0.0.1:8082. V3 NGINX remains healthy and untouched. Health/app checks pass;
anonymous protected tile requests return 401. Active ordinary accounts now use
the old Areas navigation with survey visibility filtered by the recording set
and Supabase RLS; the checklist remains platform-admin-only. Middleware
redirects now preserve the external 127.0.0.1:8082 origin. Keep V3 admin on
localhost:8080 and V2 member on 127.0.0.1:8082 so their Supabase cookies stay
isolated. The UEMPC recording scope is now only AH-026032; verify that exact
result in V3 User App Preview, then sign into V2 and smoke its orthomosaic and
explicit 3D-unavailable state.

The organization orthomap header now derives its display name, client code and
survey count from authorized survey rows. The stale legacy
`userProfile.organization` fallback that displayed `Organization / Loading...`
was removed.
