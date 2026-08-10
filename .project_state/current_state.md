# Current State

Last updated: 2026-08-10

Current branch observed by Codex: `feature/workshop-manifest-gate`.

The compressed-state workflow is active through `AGENTS.override.md` and `.project_state/`. Use these files first, then retrieve targeted docs from `.project_state/project_index.md`.

Phase 3I-A workshop manifest decisions are closed for v1. Real populated manifests stay outside Git in private Supabase tables, use short keys such as `manifest-2026-09-15`, allow `platform_admin` edits only before approval, make approved versions immutable, and back up approved exports to private MinIO.

Manifest schema/RLS/audit migrations have been applied locally and to linked staging Supabase project `llealjcaqvltrtdwwzrh` after target confirmation. Local structural verification and pgTAP tests pass; full local DB suite passes 4 files / 66 tests. Remote migration list shows migrations through `20260804004000` applied, and remote schema lint reports no errors.

Protected asset delivery is an NGINX + MinIO design with app-side auth at `/asimov-hawks/internal/asset-auth`. Recent committed slices: `5e0e4dea` app auth/RPC/tests, `284751de` point-cloud fallback, and `e30d8d96` asset URL helper plus NGINX handoff and smoke-test docs.

Active protected asset pilot: staging manifest `manifest-2026-08-10` is approved/active for `AH-026005`. It includes the DNG round-corners `tile_group` in MinIO bucket alias `tiles` and the ODM `point_cloud` in bucket alias `pointclouds` at `dng/2026/AH-026005/point-clouds/odm.pcd`. `manifest-2026-08-07` is superseded/inactive.

Local NGINX app access works after first-compile warmup. User confirmed login at `/asimov-hawks/auth/login`, authenticated direct z11/z23 pilot tile URLs, orthomap tile rendering through `http://localhost:8080`, and the survey 3D tab loading the protected ODM point cloud through NGINX.

Current local fixes ready to commit: `components/maps/ortho-map.tsx` uses `survey.ortho?.tile_folder ?? "round-corners"` instead of hardcoded `sharp-corners`, matching the active pilot manifest. `components/threejs/3d-model.tsx` uses Drei `<Html>` for point-cloud canvas fallback messages instead of rendering a raw DOM `<div>` inside `<Canvas>`.

Protected asset route behavior now matches the current pilot expectations: anonymous shell checks return `401` for protected tile and point-cloud routes, while malformed double-slash requests such as `//asimov-hawks/3d/...` are rejected with `protected_asset_denied reason='malformed_request'`.

Known validation baseline remains non-green outside DB checks: `npm run lint` fails on the documented `prefer const` plugin config issue; `npx tsc --noEmit` fails on existing application baseline files; `npm run build` reaches the Node heap limit.
