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

This rule came from the 2026-08-11 `barbco2026/AH-0260001` smoke fix. The initial manifest used `*` in the tile route and placed full paths in `destination_prefix_alias`; authorization and upstream delivery worked only after switching to placeholder route patterns and `metadata.object_path`.
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
5. Create a superseding staging manifest with entries for the new `tile_group` and `point_cloud` assets.
6. Mark the prior approved manifest superseded only through the approved supersession workflow.
7. Restart Next if protected-asset alias env values changed.
8. Run DB-side authorization simulations for platform admin and intended organization users.
9. Run NGINX smoke tests for anonymous `401`, authenticated `200`, denied cross-org `401`, and browser map/3D loading.
10. Record results in a normal docs validation log and keep `.project_state` compact.

## Acceptance Criteria

- Every migrated asset is included in the active approved staging manifest.
- Anonymous protected asset requests return `401` with no login redirect.
- Authenticated intended users can load selected tiles and point clouds through NGINX.
- Cross-organization and unknown-path requests fail closed.
- Browser orthomap renders representative tile groups.
- Survey 3D tab loads representative point clouds under the current browser size limit.
- MinIO direct hostnames, real buckets, credentials, and private prefixes are not exposed to browsers.
- Rollback source and active manifest key are recorded before expanding to the next wave.

## Rollback

Do not delete migrated MinIO prefixes as a first rollback step.

If a wave fails, freeze further migration, leave protected paths fail-closed, and supersede the manifest back to the last known-good asset set or exclude the failing entry. Use `docs/protected-asset-rollback-runbook.md` for app, NGINX, MinIO, Supabase manifest, and Cloudflare recovery checks.

## Next Decision

The current user-selected Wave 1 candidate set is:

- finish `AH-026005` by copying the remaining `round-corners/24` local zoom prefix;
- add `barbco2026/AH-0260001` as the first non-DNG tile survey;
- add the available `barbco2026/AH-0260001` ODM point cloud;
- confirm whether `AH-0260001` uses `round-corners` or `sharp-corners` in staging before manifest approval.

Use `docs/workshop-wave1-staging-prep-2026-08-10.md` for the exact local counts, byte totals, destination prefixes, and manifest-prep SQL scaffold.
