# Current State

Last updated: 2026-08-10

Current branch observed by Codex: `feature/workshop-manifest-gate`.

The compressed-state workflow is active through `AGENTS.override.md` and `.project_state/`. Use these files first, then retrieve targeted docs from `.project_state/project_index.md`.

Phase 3I-A workshop manifest decisions are closed for v1. Real populated manifests stay outside Git in private Supabase tables, use short keys such as `manifest-2026-09-15`, allow `platform_admin` edits only before approval, make approved versions immutable, and back up approved exports to private MinIO.

Manifest schema/RLS/audit migrations have been applied locally and to linked staging Supabase project `llealjcaqvltrtdwwzrh` after target confirmation. Local structural verification and pgTAP tests pass; full local DB suite passes 4 files / 66 tests. Remote migration list shows migrations through `20260804004000` applied, and remote schema lint reports no errors.

Protected asset delivery is an NGINX + MinIO design with app-side auth at `/asimov-hawks/internal/asset-auth`. Recent committed slices: `5e0e4dea` app auth/RPC/tests, `284751de` point-cloud fallback, and `e30d8d96` asset URL helper plus NGINX handoff and smoke-test docs.

Active protected tile pilot: staging manifest `manifest-2026-08-07` is approved for `AH-026005` DNG round-corners tiles in MinIO bucket alias `tiles` at `dng/2026/AH-026005/ortho/round-corners`. Verified copied subset is `42,547` objects / `2.8GiB`; details are in `docs/protected-asset-pilot-validation-log.md`.

Rollback planning now lives in `docs/protected-asset-rollback-runbook.md`. Current validation snapshot lives in `docs/validation-baseline-2026-08-10.md`.

Current blocker: Next dev starts with `PROTECTED_ASSET_STORAGE_TILES_ROOT=tiles` and reports ready, but local `/asimov-hawks`, NGINX `/asimov-hawks`, protected tile routes, and direct `/internal/asset-auth` probes timed out while the app was compiling/serving. Authenticated protected tile smoke tests remain pending.

Known validation baseline remains non-green outside DB checks: `npm run lint` fails on the documented `prefer const` plugin config issue; `npx tsc --noEmit` fails on existing application baseline files and does not list protected-asset helper files; `npm run build` reaches the Node heap limit.
