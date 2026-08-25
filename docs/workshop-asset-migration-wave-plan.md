# Workshop Asset Migration Wave Plan

Last updated: 2026-08-11

Status: planning runbook for expanding the proven MinIO protected-asset pilot beyond `AH-026005`. Do not treat this as approval to migrate production or full-history assets. Execution prep for the current Wave 1 candidate set is recorded in `docs/workshop-wave1-staging-prep-2026-08-10.md`.

## Purpose

Use controlled migration waves to move only workshop-candidate GIS assets from local `public/tiles` and `public/3d` style storage into MinIO-backed protected delivery.

The September 7-18 asset-migration window remains the latest acceptable window, not the earliest start. Early waves are rehearsal and hardening for the invited workshop cohort.

## Current Proven Baseline

- Active staging manifest: `manifest-2026-08-11`.
- Proven tile bucket alias: `tiles`.
- Proven point-cloud bucket alias: `pointclouds`.
- Proven tile path shape: `<client-code>/2026/<survey-id>/ortho/<tile-folder>/<z>/<x>/<y>.png`.
- Proven point-cloud path shape: `<client-code>/2026/<survey-id>/point-clouds/odm.pcd`.
- Browser-facing URLs remain `/asimov-hawks/tiles/...` and `/asimov-hawks/3d/...`.
- NGINX `auth_request` plus the app `/asimov-hawks/internal/asset-auth` endpoint is the protected asset boundary.

## Wave 1 Scope

Select two or three representative workshop-candidate surveys before broad migration:

- one tile-heavy survey with a complete orthomosaic folder;
- one survey with an ODM point cloud;
- one non-DNG client if an approved workshop candidate exists, to verify client-code and organization mapping are not hardcoded to the pilot.

Keep `AH-026005` as the control sample. Do not remigrate it unless rollback or prefix repair requires it. Current execution prep has identified one remaining local `AH-026005` `round-corners/24` zoom prefix that still needs to be copied into MinIO before the control sample is truly complete.

Do not include:

- full historical datasets;
- non-invited clients;
- assets not intended for the workshop;
- detections in NGINX/MinIO for v1;
- Cloudflare caching changes.

## Manifest Entry Shape Rules

Use this proven shape for direct MinIO-backed protected assets:

- `nginx_route_pattern` is the browser-facing route, not the MinIO object path.
- Tile route patterns must use explicit placeholders such as `{z}/{x}/{y}.png`; do not use `*` because the authorization RPC does not expand it.
- Point-cloud route patterns should match the exact browser URL, for example `/asimov-hawks/3d/<client-code>/2026/<survey-id>/odm.pcd`.
- `destination_storage_alias` selects the bucket alias, such as `tiles` or `pointclouds`.
- Leave `destination_prefix_alias` null unless it names a deliberately configured alias in `lib/assets/minio-aliases.ts`.
- Put the actual MinIO prefix or object key in `metadata.object_path`.
- For tile groups, `metadata.object_path` is the tile prefix without `{z}/{x}/{y}.png`.
- For point clouds, `metadata.object_path` is the full object key including the filename.
- For tile groups, the active `public.orthos.tile_folder` value must match the route folder in the approved manifest entry. The app should request the manifest-authorized folder, not guess between `round-corners` and `sharp-corners` at runtime.

This rule came from the 2026-08-11 `barbco2026/AH-0260001` and `AH-0260002`/`AH-0260003` smoke fixes. The initial manifest used `*` in the tile route and placed full paths in `destination_prefix_alias`; authorization and upstream delivery worked only after switching to placeholder route patterns and `metadata.object_path`. Later testing showed browser-side tile-folder guessing can request paths outside the manifest allow-list, so migrations must align `orthos.tile_folder`, `metadata.tile_folder`, `metadata.object_path`, and `nginx_route_pattern` before approval.

## Required Per-Asset Record

For each selected tile group or point cloud, record outside Git if values are sensitive:

- client code, survey ID, and organization/client references;
- source path and rollback source;
- destination bucket alias and object prefix;
- tile folder/style and zoom range for tile groups;
- object count and total bytes after copy;
- sample protected URL for z-min and z-max tile checks where applicable;
- expected point-cloud filename and size;
- active or superseding manifest key;
- operator, date, and verification notes.

Checksums remain optional for this workshop unless the project lead requires them. Counts, byte totals, and representative smoke tests are required where practical.

## Migration Procedure

1. Confirm the target environment and that the selected assets are workshop candidates.
2. Inventory the local source prefix without recursively walking unrelated client folders.
3. Copy to MinIO using the established aliases: tile groups to `tiles/<client-code>/2026/<survey-id>/ortho/<tile-folder>` and point clouds to `pointclouds/<client-code>/2026/<survey-id>/point-clouds/<file>`.
4. Verify object count, total bytes, expected zoom folders, and representative sample objects.
5. Before manifest approval, run the publisher report SQL to verify or update the current `public.orthos.tile_folder` row so the browser route matches the protected tile-group entry.
6. Create a superseding staging manifest with entries for the new `tile_group` and `point_cloud` assets.
7. Mark the prior approved manifest superseded only through the approved supersession workflow.
8. Restart Next if protected-asset alias env values changed.
9. Run DB-side authorization simulations for platform admin and intended organization users.
10. Run NGINX smoke tests for anonymous `401`, authenticated `200`, denied cross-org `401`, and browser map/3D loading.
11. Record results in a normal docs validation log and keep `.project_state` compact.

## Acceptance Criteria

- Every migrated asset is included in the active approved staging manifest.
- Anonymous protected asset requests return `401` with no login redirect.
- Authenticated intended users can load selected tiles and point clouds through NGINX.
- Cross-organization and unknown-path requests fail closed.
- Browser orthomap renders representative tile groups.
- Survey 3D tab loads representative point clouds; the publisher imposes no 1 GB file-size cap, so browser/network validation remains required.
- MinIO direct hostnames, real buckets, credentials, and private prefixes are not exposed to browsers.
- Rollback source and active manifest key are recorded before expanding to the next wave.

## Rollback

Do not delete migrated MinIO prefixes as a first rollback step.

If a wave fails, freeze further migration, leave protected paths fail-closed, and supersede the manifest back to the last known-good asset set or exclude the failing entry. Use `docs/protected-asset-rollback-runbook.md` for app, NGINX, MinIO, Supabase manifest, and Cloudflare recovery checks.

## 2026-08-25 Batch Workflow

The current workflow is documented in
`docs/workshop-asset-batch-runbook.md`. Survey selection now comes only from
the ignored private allowlist; there is no preselected replacement wave.
`AH-026012` and `AH-026013` are permanently excluded. The project lead will
add approved survey IDs, tile variants, exact PCD paths, and ignored PCD review
records before another dry run.

No upload begins until the generated staging/database/source/capacity reports
are clean and one wave is explicitly reviewed and SHA-256 frozen. Uploads may
then run in the background one wave at a time. Generated manifest SQL remains a
separate review-only handoff and never mutates staging automatically.
