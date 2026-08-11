# Workshop Wave 1 Staging Prep

Last updated: 2026-08-11

Status: execution prep and validation notes for finishing the `AH-026005` control sample and staging `barbco2026/AH-0260001` as the first non-DNG workshop candidate.

## Selected Scope

### 1. Finish `AH-026005`

The active protected pilot proves `AH-026005` for `round-corners` tiles and the ODM point cloud, but the local tile tree still contains an additional zoom level that was not part of the documented MinIO pilot expansion.

- Local remaining tile prefix: `public/tiles/dng/2026/AH-026005/ortho/round-corners/24`
- Destination protected prefix: `tiles/dng/2026/AH-026005/ortho/round-corners/24`
- Local zoom-24 tile count: `125,930`
- Local zoom-24 total bytes: `3,543,993,611`
- Local zoom-24 top-level directories: `490`

This should be copied and then verified against the real `tiles` bucket before superseding the current staging manifest.

### 2. First `barbco2026` wave candidate

The user selected `AH-0260001` as the first `barbco2026` workshop candidate.

- Tile root: `public/tiles/barbco2026/2026/AH-0260001/ortho`
- Tile folders present locally: `round-corners`, `sharp-corners`
- Zoom levels present locally for `round-corners`: `11` through `24`
- `round-corners` local tile count: `157,423`
- `round-corners` local total bytes: `5,531,710,036`
- `sharp-corners` local tile count: `157,423`
- `sharp-corners` local total bytes: `5,516,933,963`
- Point-cloud source: `public/3d/barbco2026/2026/AH-0260001/odm.pcd`
- Point-cloud size: `58,328,382` bytes

## Tile-Folder Expectation

The application builds survey tile URLs from `survey.ortho?.tile_folder ?? "round-corners"`.

That means:

- `round-corners` is the minimum safe tile-group mirror for `AH-0260001`;
- `sharp-corners` is only required if the staging survey record for `AH-0260001` explicitly uses that folder;
- the staging survey row should be checked before the manifest is approved so the MinIO copy matches the browser path the app will request.

## Recommended Copy Targets

### `AH-026005`

- Copy `public/tiles/dng/2026/AH-026005/ortho/round-corners/24`
- To `tiles/dng/2026/AH-026005/ortho/round-corners/24`

### `barbco2026/AH-0260001`

Minimum safe Wave 1 copy:

- `public/tiles/barbco2026/2026/AH-0260001/ortho/round-corners`
- to `tiles/barbco2026/2026/AH-0260001/ortho/round-corners`
- `public/3d/barbco2026/2026/AH-0260001/odm.pcd`
- to `pointclouds/barbco2026/2026/AH-0260001/point-clouds/odm.pcd`

Conditional copy:

- `public/tiles/barbco2026/2026/AH-0260001/ortho/sharp-corners`
- to `tiles/barbco2026/2026/AH-0260001/ortho/sharp-corners`
- only if the staging `orthos.tile_folder` for `AH-0260001` is `sharp-corners`

## Manifest Prep Notes

Current active staging manifest is `manifest-2026-08-11`.

`manifest-2026-08-11` superseded `manifest-2026-08-10` and preserved the already-working `AH-026005` tile-group and point-cloud entries while expanding coverage to:

- the completed `AH-026005` round-corners tile prefix including zoom `24`;
- one `barbco2026/AH-0260001` tile-group entry;
- one `barbco2026/AH-0260001` point-cloud entry.

The first `AH-0260001` smoke attempt found two manifest-shape mistakes:

- `nginx_route_pattern` used `*`, but the auth RPC only expands `{z}`, `{x}`, `{y}`, and `{file}` placeholders.
- `destination_prefix_alias` held the full object prefix/path, which made upstream MinIO paths resolve incorrectly. For direct per-entry prefixes, leave `destination_prefix_alias` null and set `metadata.object_path` to the actual MinIO object prefix/path.

The corrected and user-validated `AH-0260001` shape is:

- tile route pattern: `/asimov-hawks/tiles/barbco2026/2026/AH-0260001/ortho/round-corners/{z}/{x}/{y}.png`
- tile object path: `barbco2026/2026/AH-0260001/ortho/round-corners`
- point-cloud route pattern: `/asimov-hawks/3d/barbco2026/2026/AH-0260001/odm.pcd`
- point-cloud object path: `barbco2026/2026/AH-0260001/point-clouds/odm.pcd`
- `destination_storage_alias`: `tiles` for tiles and `pointclouds` for point clouds
- `destination_prefix_alias`: null for both rows
- `metadata.object_path`: same as the object path above

User validation on 2026-08-11 confirmed `AH-0260001` orthomap tiles and the 3D point cloud render through NGINX after those DB-side fixes.

## SQL Shape To Prepare In Staging

The exact `organization_id`, `client_id`, `survey_id`, and creator/approver values must come from the linked staging project. This template is only a prep scaffold.

```sql
-- 1. create the superseding draft/reviewed manifest
insert into public.workshop_manifests (
  manifest_key,
  status,
  dataset_year,
  title,
  description,
  supersedes_manifest_id,
  notes,
  metadata
)
select
  'manifest-2026-08-11',
  'reviewed',
  2026,
  'Expanded protected asset pilot with AH-026005 completion and barbco2026 AH-0260001',
  'Supersedes the 2026-08-10 active manifest after AH-026005 z24 upload and the first barbco2026 wave copy.',
  manifest.id,
  'Prepared on 2026-08-10 after local inventory and user-approved Wave 1 selection.',
  jsonb_build_object(
    'prepared_on', '2026-08-10',
    'supersedes_key', manifest.manifest_key
  )
from public.workshop_manifests as manifest
where manifest.manifest_key = 'manifest-2026-08-10';

-- 2. insert or copy forward the full active asset set under the new manifest
-- Replace the placeholder ids before execution.
insert into public.workshop_manifest_entries (
  manifest_id,
  entry_type,
  organization_id,
  client_id,
  survey_id,
  reference_key,
  display_label,
  source_alias,
  destination_storage_alias,
  destination_prefix_alias,
  nginx_route_pattern,
  protection_level,
  verification,
  metadata,
  notes
)
values
  (
    :new_manifest_id,
    'tile_group',
    :dng_organization_id,
    :dng_client_id,
    'AH-026005',
    'dng/2026/AH-026005/ortho/round-corners',
    'AH-026005 orthomap round-corners',
    'local-public-tiles',
    'tiles',
    null,
    '/asimov-hawks/tiles/dng/2026/AH-026005/ortho/round-corners/{z}/{x}/{y}.png',
    'organization',
    jsonb_build_object(
      'local_zoom_levels', jsonb_build_array(11,12,13,14,15,16,17,18,19,20,21,22,23,24),
      'local_remaining_zoom24_count', 125930,
      'local_remaining_zoom24_bytes', 3543993611
    ),
    jsonb_build_object(
      'client_code', 'dng',
      'survey_id', 'AH-026005',
      'tile_folder', 'round-corners',
      'object_path', 'dng/2026/AH-026005/ortho/round-corners'
    ),
    'Copy forward the AH-026005 tile-group entry and verify MinIO now includes zoom 24.'
  ),
  (
    :new_manifest_id,
    'point_cloud',
    :dng_organization_id,
    :dng_client_id,
    'AH-026005',
    'dng/2026/AH-026005/point-clouds/odm.pcd',
    'AH-026005 ODM point cloud',
    'local-public-3d',
    'pointclouds',
    null,
    '/asimov-hawks/3d/dng/2026/AH-026005/odm.pcd',
    'organization',
    jsonb_build_object(
      'validated_on', '2026-08-10'
    ),
    jsonb_build_object(
      'client_code', 'dng',
      'survey_id', 'AH-026005',
      'file_name', 'odm.pcd',
      'object_path', 'dng/2026/AH-026005/point-clouds/odm.pcd'
    ),
    'Copy forward the already-working AH-026005 point-cloud entry.'
  ),
  (
    :new_manifest_id,
    'tile_group',
    :barbco_organization_id,
    :barbco_client_id,
    'AH-0260001',
    'barbco2026/2026/AH-0260001/ortho/round-corners',
    'AH-0260001 orthomap round-corners',
    'local-public-tiles',
    'tiles',
    null,
    '/asimov-hawks/tiles/barbco2026/2026/AH-0260001/ortho/round-corners/{z}/{x}/{y}.png',
    'organization',
    jsonb_build_object(
      'local_zoom_levels', jsonb_build_array(11,12,13,14,15,16,17,18,19,20,21,22,23,24),
      'local_count', 157423,
      'local_bytes', 5531710036
    ),
    jsonb_build_object(
      'client_code', 'barbco2026',
      'survey_id', 'AH-0260001',
      'tile_folder', 'round-corners',
      'object_path', 'barbco2026/2026/AH-0260001/ortho/round-corners'
    ),
    'Use this tile-group entry if staging survey tile_folder is round-corners or null.'
  ),
  (
    :new_manifest_id,
    'point_cloud',
    :barbco_organization_id,
    :barbco_client_id,
    'AH-0260001',
    'barbco2026/2026/AH-0260001/point-clouds/odm.pcd',
    'AH-0260001 ODM point cloud',
    'local-public-3d',
    'pointclouds',
    null,
    '/asimov-hawks/3d/barbco2026/2026/AH-0260001/odm.pcd',
    'organization',
    jsonb_build_object(
      'local_bytes', 58328382
    ),
    jsonb_build_object(
      'client_code', 'barbco2026',
      'survey_id', 'AH-0260001',
      'file_name', 'odm.pcd',
      'object_path', 'barbco2026/2026/AH-0260001/point-clouds/odm.pcd'
    ),
    'First barbco2026 point-cloud entry for Wave 1 smoke testing.'
  );
```

If the staging survey record for `AH-0260001` uses `sharp-corners`, replace the `tile_group` reference key, `metadata.object_path`, URL pattern, and metadata tile folder accordingly, or add a second tile-group entry only if the approved manifest truly needs both paths.

## Smoke-Test Targets After Copy

- `http://localhost:8080/asimov-hawks/tiles/dng/2026/AH-026005/ortho/round-corners/24/...`
- `http://localhost:8080/asimov-hawks/tiles/barbco2026/2026/AH-0260001/ortho/round-corners/11/...`
- `http://localhost:8080/asimov-hawks/tiles/barbco2026/2026/AH-0260001/ortho/round-corners/24/...`
- `http://localhost:8080/asimov-hawks/3d/barbco2026/2026/AH-0260001/odm.pcd`

Also rerun:

- anonymous direct protected requests should return `401`;
- cross-org authenticated requests should fail closed;
- the survey orthomap and 3D tab should render through the normal app flows.
