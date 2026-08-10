# Session Handoff

Last updated: 2026-08-10

Protected asset app-side implementation is in place on `feature/workshop-manifest-gate`. Recent committed slices are `5e0e4dea` for app auth/RPC/tests, `284751de` for point-cloud fallback, `e30d8d96` for asset URL helper plus NGINX handoff and smoke-test docs, `d3daf0cd` for refreshed protected-asset docs/state, and `57b6b378` for the protected-asset pilot smoke follow-up.

Current active staging manifest is `manifest-2026-08-10`. It supersedes `manifest-2026-08-07`, which is now superseded/inactive. Active entries include the existing `AH-026005` DNG round-corners `tile_group` in bucket alias `tiles` and a new ODM `point_cloud` entry in bucket alias `pointclouds` at `dng/2026/AH-026005/point-clouds/odm.pcd`.

User-confirmed smoke status: NGINX app access works after initial Next compile warmup. Login at `http://localhost:8080/asimov-hawks/auth/login` works, authenticated direct z11/z23 protected tile URLs worked, the orthomap renders tiles after the local tile-folder fix, and the survey 3D tab loads the protected ODM point cloud.

Workshop smoke baseline is documented in `docs/validation-baseline-2026-08-10.md`. It records the login flow, orthomap flow, protected point-cloud flow, anonymous fail-closed checks, and malformed double-slash rejection for 2026-08-10.

Lint status update: `eslint.config.mjs` now uses `prefer-const`; the map/data-tab lint errors were cleared; and `npm run lint` now exits successfully with warnings only. The remaining lint debt is mostly `no-console`, `@typescript-eslint/no-explicit-any`, and a few hook dependency warnings.

Git status note: feature commit `57b6b378` is pushed to `origin/feature/workshop-manifest-gate`, and `origin/development` includes the merge at `6be83d42`.

Next task: choose between continuing warning-only lint cleanup or switching to the TypeScript baseline.
