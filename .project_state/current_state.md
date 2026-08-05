# Current State

Last updated: 2026-08-05

Current branch observed by Codex: `feature/workshop-manifest-gate`.

The compressed-state workflow is in place through `AGENTS.override.md` and `.project_state/`.

Phase 3I-A workshop manifest decisions are closed for v1. The project lead approver is tied to `visualization.hawks@gmail.com`. The real manifest should live in private Supabase tables, use short version IDs such as `manifest-2026-09-15`, allow `platform_admin` edits for draft/reviewed records, make approved versions immutable, and back up approved exports to private MinIO.

Manifest schema/RLS/audit migrations are local-only and have been applied successfully through `npx supabase db reset --local`. Structural verification passed through psql. The new `supabase/tests/workshop_manifest_gate.sql` pgTAP behavior test passes. Existing `authorization.sql` and corrected `domain_authorization.sql` also pass. Full local DB test suite now passes: 4 files, 66 tests. `npx supabase db lint --local --level warning` reports no schema errors. Do not apply remotely before target confirmation and review.

Protected asset delivery design is drafted in `docs/protected-asset-delivery-design.md`, with review fixes in `docs/protected-asset-delivery-review-fixes.md`. Direction: NGINX proxy with MinIO internal offloading, NGINX `auth_request` to `/asimov-hawks/internal/asset-auth`, organization-scoped authorization, Cloudflare cache bypass for protected GIS assets, clean `204`/`401` auth endpoint behavior with no redirects, detections retained server-side through Supabase Storage for v1, and direct point-cloud downloads up to 1 GB.

Protected asset implementation planning is approved in `docs/protected-asset-implementation-plan.md`. This repo remains strictly Next.js app-side; NGINX/Compose config belongs to the existing external WSL Docker infrastructure. Protected asset app/RPC/test slice is committed as `5e0e4dea`. Point-cloud fallback handling is committed as `284751de`. External NGINX handoff is documented in `docs/protected-asset-nginx-handoff-checklist.md`; local smoke tests are documented in `docs/protected-asset-local-smoke-tests.md`. Phase 2 asset URL helper is in progress through `lib/assets/asset-urls.ts` and map/3D callers now use `NEXT_PUBLIC_ASSET_BASE_URL ?? "/asimov-hawks"` for protected tiles and point clouds.

Local infrastructure is running on WSL + Docker with NGINX, object storage, Prometheus, Grafana, Alertmanager, Node Exporter, NGINX exporter, and object storage metrics. The Next.js app is proxied through external WSL NGINX to the Windows dev server for local testing.

Local WSL NGINX milestone: external `hawks-nginx` now proxies the app at `http://localhost:8080/asimov-hawks`; anonymous protected tile and point-cloud routes return `401`; a local/dev-only bypass for `/asimov-hawks/tiles/hawks/2024/` restores existing repo `public/tiles` survey rendering while MinIO migration is pending. Verified sample legacy tile `hawks/2024/SD-001/ortho/sharp-corners/18/222589/136551.png` returns `200 OK` through NGINX. This bypass must not be used as the production protected-asset path.

Known application validation baseline: `npm run lint` is documented as failing, `npx tsc --noEmit` has existing TypeScript errors, and `npm run build` has reached the Node heap limit. After protected asset app-side implementation, `npx tsc --noEmit` still fails only on existing application baseline files; no protected-asset files appear in the TypeScript error list. `npx supabase db reset --local`, `npx supabase db lint --local --level warning`, and full `npx supabase test db --local` pass after adding the protected asset RPC migration and focused protected asset RPC pgTAP coverage. The DB suite now has 4 files and 66 tests.

Latest local commit for the manifest/protected-asset planning baseline: `aa9f81d3`.