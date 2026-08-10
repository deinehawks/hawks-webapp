# Session Handoff

Last updated: 2026-08-10

Protected asset app-side implementation is in place on `feature/workshop-manifest-gate`. Recent committed slices are `5e0e4dea` for app auth/RPC/tests, `284751de` for point-cloud fallback, `e30d8d96` for asset URL helper plus NGINX handoff and smoke-test docs, `d3daf0cd` for refreshed protected-asset docs/state, and `57b6b378` for the protected-asset pilot smoke follow-up.

Current active staging manifest is `manifest-2026-08-10`. It supersedes `manifest-2026-08-07`, which is now superseded/inactive. Active entries include the existing `AH-026005` DNG round-corners `tile_group` in bucket alias `tiles` and a new ODM `point_cloud` entry in bucket alias `pointclouds` at `dng/2026/AH-026005/point-clouds/odm.pcd`.

User-confirmed smoke status: NGINX app access works after initial Next compile warmup. Login at `http://localhost:8080/asimov-hawks/auth/login` works, authenticated direct z11/z23 protected tile URLs worked, the orthomap renders tiles after the local tile-folder fix, and the survey 3D tab loads the protected ODM point cloud.

Workshop smoke baseline is documented in `docs/validation-baseline-2026-08-10.md`. It records the login flow, orthomap flow, protected point-cloud flow, anonymous fail-closed checks, and malformed double-slash rejection for 2026-08-10.

Validation status update: `eslint.config.mjs` now uses `prefer-const`; the map/data-tab lint errors were cleared; `npm run lint` now exits successfully with warnings only; and `npx tsc --noEmit` now passes after typing cleanup across caller wrappers, dashboard/survey/ortho map components, and shared helpers.

MinIO migration-wave planning is documented in `docs/workshop-asset-migration-wave-plan.md`. Exact Wave 1 execution prep is documented in `docs/workshop-wave1-staging-prep-2026-08-10.md`.

Current Wave 1 selection and gaps:

- `AH-026005` still has a remaining local `round-corners/24` tile prefix that should be copied into the `tiles` bucket before treating the control sample as complete.
- Manual upload of the full `AH-026005` zoom-24 scope crashed MinIO; staged batch upload succeeded for Batch 1 using `scripts/stage-ah-026005-z24-batch.ps1`.
- `barbco2026/AH-0260001` is the selected first non-DNG workshop candidate.
- Local inventory for `AH-0260001` confirms `round-corners` and `sharp-corners` tile folders, zoom levels `11` through `24`, and an `odm.pcd` point cloud at `58,328,382` bytes.
- App-side tile requests use `survey.ortho?.tile_folder ?? "round-corners"`, so `round-corners` is the minimum safe tile-group mirror unless staging data explicitly points to `sharp-corners`.

Protected asset publisher automation now exists:

- `scripts/publish-protected-assets.js`
- `scripts/minio-publish-jobs.example.json`
- npm scripts: `npm run publish-protected-assets` and `npm run publish-protected-assets:apply`
- report output: `.tmp/minio-publish-reports/`
- resumable state output: `.tmp/minio-publish-state/`

Dry-run planning for `barbco2026/AH-0260001` succeeded. It planned `48` tile batches for `round-corners` and one point-cloud upload to `pointclouds/barbco2026/2026/AH-0260001/point-clouds/odm.pcd`.

Live apply has not been exercised yet because this repo-local environment does not currently expose MinIO connection credentials. The uploader expects private env vars such as `MINIO_S3_ENDPOINT`, `MINIO_ACCESS_KEY`, and `MINIO_SECRET_KEY`, while still reusing the existing alias roots like `PROTECTED_ASSET_STORAGE_TILES_ROOT` and `PROTECTED_ASSET_STORAGE_POINTCLOUDS_ROOT`.

Git status note: feature commit `57b6b378` is pushed to `origin/feature/workshop-manifest-gate`, and `origin/development` includes the merge at `6be83d42`.

Next task: continue the staged `AH-026005` zoom-24 uploads, then run the new publisher in apply mode for `barbco2026/AH-0260001` once live MinIO credentials are available, then supersede the staging manifest and run authenticated plus anonymous NGINX smoke tests.
