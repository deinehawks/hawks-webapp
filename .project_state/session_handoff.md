# Session Handoff

Last updated: 2026-08-10

Protected asset app-side implementation is in place on `feature/workshop-manifest-gate`. Recent committed slices are `5e0e4dea` for app auth/RPC/tests, `284751de` for point-cloud fallback, and `e30d8d96` for asset URL helper plus NGINX handoff and smoke-test docs.

Current staging pilot uses active approved manifest `manifest-2026-08-07` for `AH-026005` DNG round-corners tiles in MinIO bucket alias `tiles` at `dng/2026/AH-026005/ortho/round-corners`. Verified copied subset is `42,547` objects / `2.8GiB`; detailed chronology lives in `docs/protected-asset-pilot-validation-log.md`.

Added `docs/protected-asset-rollback-runbook.md` and `docs/validation-baseline-2026-08-10.md`.

Validation status: local DB baseline remains green from the previous protected asset RPC pass; linked staging migrations through `20260804004000` are applied. `npm run lint`, `npx tsc --noEmit`, and `npm run build` remain non-green for documented baseline reasons.

Smoke-test status: Next dev was started with `PROTECTED_ASSET_STORAGE_TILES_ROOT=tiles` and reported ready, but `/asimov-hawks`, NGINX `/asimov-hawks`, z11/z23 protected tiles, and direct `/internal/asset-auth` probes timed out. Stale project-local dev processes were stopped after validation attempts. Authenticated tile `200` testing remains pending.

Next task: diagnose why local Next dev hangs while compiling or serving routes, then rerun the protected tile smoke tests for:

- `/asimov-hawks/tiles/dng/2026/AH-026005/ortho/round-corners/11/1739/1067.png`
- `/asimov-hawks/tiles/dng/2026/AH-026005/ortho/round-corners/23/7125550/4370844.png`
