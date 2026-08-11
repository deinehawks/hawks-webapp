# Current State

Last updated: 2026-08-11

Current branch observed by Codex: `feature/workshop-manifest-gate`.

The compressed-state workflow is active through `AGENTS.override.md` and `.project_state/`. Use these files first, then retrieve targeted docs from `.project_state/project_index.md`.

Phase 3I-A workshop manifest decisions are closed for v1. Real populated manifests stay outside Git in private Supabase tables, use short keys such as `manifest-2026-09-15`, allow `platform_admin` edits only before approval, make approved versions immutable, and back up approved exports to private MinIO.

Manifest schema/RLS/audit migrations have been applied locally and to linked staging Supabase project `llealjcaqvltrtdwwzrh` after target confirmation. Local structural verification and pgTAP tests pass; full local DB suite passes 4 files / 66 tests. Remote migration list shows migrations through `20260804004000` applied, and remote schema lint reports no errors.

Protected asset delivery is an NGINX + MinIO design with app-side auth at `/asimov-hawks/internal/asset-auth`. Recent committed slices: `5e0e4dea` app auth/RPC/tests, `284751de` point-cloud fallback, `e30d8d96` asset URL helper plus NGINX handoff and smoke-test docs, `d3daf0cd` refreshed protected-asset docs/state, and `57b6b378` protected-asset pilot smoke follow-up.

Active protected asset pilot: staging manifest `manifest-2026-08-11` is approved/active. It includes `AH-026005` DNG protected tiles/point cloud and `barbco2026/AH-0260001` protected `round-corners` tiles plus ODM point cloud. `manifest-2026-08-10` is superseded/inactive.

Local NGINX app access works after first-compile warmup. User confirmed login at `/asimov-hawks/auth/login`, authenticated direct z11/z23 pilot tile URLs, orthomap tile rendering through `http://localhost:8080`, and the survey 3D tab loading the protected ODM point cloud through NGINX.

Workshop smoke baseline is documented in `docs/validation-baseline-2026-08-10.md`: login flow, orthomap flow, protected point-cloud flow, anonymous fail-closed behavior, and malformed double-slash rejection are all recorded for 2026-08-10.

Validation baseline update: `npm run lint` now completes successfully with warnings only, and `npx tsc --noEmit` now passes after typing cleanup across caller wrappers, survey/ortho map flows, shared helpers, and dashboard map components.

Protected asset publisher automation now exists locally in `scripts/publish-protected-assets.js` with example config `scripts/minio-publish-jobs.example.json`. Dry-run planning for `barbco2026/AH-0260001` succeeded and wrote a report under `.tmp/minio-publish-reports/`.

Manifest lesson from `AH-0260001`: tile `nginx_route_pattern` values must use `{z}/{x}/{y}.png` rather than `*`, and direct MinIO prefixes/object keys belong in `metadata.object_path` with `destination_prefix_alias = null` unless a real code alias exists. See `docs/workshop-asset-migration-wave-plan.md` and `docs/workshop-wave1-staging-prep-2026-08-10.md`.

Build-baseline constraint: the workshop target keeps heavy GIS assets behind NGINX + MinIO, not inside the Next.js runtime image. `public/tiles` and `public/3d` should be treated as local operational datasets, so `npm run build` should be evaluated against a dataset-light build context rather than this heavy local checkout.

Known validation baseline remains partially non-green outside DB checks: `npm run lint` passes with warnings, `npx tsc --noEmit` now passes, and `npm run build` still reaches the Node heap limit in the current heavy-asset checkout.
