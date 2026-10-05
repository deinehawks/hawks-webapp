# Current state
Last updated: 2026-10-05.

Dynamic-publishing compatibility is implemented locally. V2 no longer reads
`.recording/selection.json`, `catalog.json`, or output bindings when loading
the dashboard. It calls V3's RLS-aware
`list_authorized_published_survey_assets()` contract, then requires each
published artifact to match the survey's current specialized ortho/point-cloud
record before rendering. Empty publication scope produces a friendly empty
dashboard; cross-scope and mismatched artifacts fail closed. The old files and
builders remain historical migration evidence only. Dataset years are no longer
hardcoded to 2026 and safe verified PCD filenames are supported up to the
existing 5 GiB gate. Recording tests pass 30/30. Repository-wide TypeScript
still reports only documented legacy V2 UI errors; none are in the new dynamic
loader or protected-asset files. The required V3 migration is local only, so do
not restart/use this code against staging until that migration is separately
rehearsed, approved, applied and verified.

Historical recovery note: the temporary screencast bypass was removed. The selection was restored from
the 21 verified reports (AH-026070 restored; unverified AH-0260001 removed),
the catalog again contains exactly 58 verified surveys, and the normal
RLS-filtered loader is active without a hardcoded demo client/filter. Focused
recording tests pass 29/29. V2 was restarted and is healthy through
127.0.0.1:8082.

This repository is **asimov-hawks V2**, the separate local recording application.
Independent clone at E:/dev/projects/webapps/asimov-hawks/asimov-hawks V2;
baseline 8e0e157c; branch fix/v2-recording-compat. Changes are uncommitted.
The original checkout at .../V2/asimov-hawks is **asimov-hawks V3**; its folder,
branch, files and services were preserved.

Prepared: staging-only active-account data loaders with RLS-filtered survey
visibility; platform-admin-only checklist; protected asset-auth;
verified-catalog tile/PCD paths; multi-client navigation; recording checklist;
missing-date/boundary handling; signup disabled in this recording copy.
Ignored configuration contains only staging URL/anon key, the 58 selected IDs,
and the V3 evidence source path. The ignored catalog is now generated.

Migration evidence audit passed for all 21 waves: exactly 58 surveys,
3,311,283 objects and 201,134,174,000 bytes. No new live object scan performed.
V2 npm ci and route type generation passed; 29/29 focused tests passed.
Production build passed with existing type/lint bypasses and Supabase Edge
runtime warnings. Standalone TypeScript fails in the legacy UI; full regression
classification remains pending. Lint fails on the existing "prefer const" rule.
Survey-table nullable metadata compatibility was corrected.
Staging now has current orthos for all 58 selected surveys and current PCD rows
for 11; 56 dates remain null. The reviewed 77-entry manifest is active on
staging. No production or MinIO infrastructure change was performed.
Platform-admin browser acceptance passed. The recording scope was narrowed by
the supervisor: the UEMPC member should retain only AH-026032 (the approved
100-meter survey). Revocation of the other grants is reported complete, but a
fresh isolated-member-session confirmation remains pending.
The checksummed r4 cumulative package was rehearsed, approved and applied in V3;
unknown dates remain null and the two existing PCD rows remain unchanged by
decision.
The user decided unknown dates remain null and the current AH-026012/AH-026013
output rows, counts and survey pointers must not change. Exact output-to-asset
bindings are implemented: the loader now requires the survey pointer, current
row code, and reviewed binding to match. The ignored binding file preserves the
two existing identities and describes nine future output identities.
The compatibility viewer's PCD admission gate is now 5 GiB, shared by the
recording checklist and Three.js viewer. Validation: 29/29 focused tests, local
11-binding runtime check and production build pass. Multi-GiB browser/GPU
behavior still requires real-device smoke. Standalone TypeScript retains only
the documented legacy V2 errors.

V3's checksummed r4 package passed backup/isolated rehearsal and was explicitly
approved and applied to staging. Post-apply verification passed: 58 current
orthos, 11 current PCDs and 56 null dates. Separate review and activation
transitions passed; the 77-entry manifest is reviewed and active. MinIO, V3
NGINX and production remain unchanged. The
isolated V2 NGINX container is healthy at 127.0.0.1:8082. It did not modify
V3 NGINX. App/health routes pass; anonymous tiles and ranged PCD requests return
401 with private/no-store. The current member implementation restores the old
Areas navigation, returns 404 for unauthorized survey routes, and exposes an
explicit no-3D state when a verified PCD is absent.
Proxy-aware middleware redirects now preserve
http://127.0.0.1:8082/asimov-hawks instead of leaking the internal
localhost:3200 origin. Focused regression remains 29/29.
See ../RECORDING-SETUP.md for setup and remaining gates.
