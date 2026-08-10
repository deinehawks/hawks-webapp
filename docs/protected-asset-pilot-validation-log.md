# Protected Asset Pilot Validation Log

Last updated: 2026-08-10

Status: detailed operational note for the 2026-08-05 protected tile pilot. Keep compact startup status in `.project_state/` and use this file for chronology, validation evidence, and troubleshooting context.

## Summary

The first protected tile pilot for `AH-026005` selected a route-compatible v1 layout and moved the verified DNG round-corners tile subset into the real MinIO `tiles` bucket. Staging manifest supersession produced active approved `manifest-2026-08-07`, which points to bucket alias `tiles` and object path `dng/2026/AH-026005/ortho/round-corners`.

Authenticated browser/NGINX smoke testing is still pending after restarting Next dev with `PROTECTED_ASSET_STORAGE_TILES_ROOT=tiles`.

## Staging Database State

Linked staging Supabase project ref: `llealjcaqvltrtdwwzrh`.

Remote apply on 2026-08-05 used target-confirmed `npx supabase db push --linked` and applied:

- `20260804000000_workshop_manifest_gate.sql`
- `20260804001000_workshop_manifest_supersession_guard.sql`
- `20260804002000_workshop_manifest_review_fixes.sql`
- `20260804003000_workshop_manifest_activation_guard.sql`
- `20260804004000_protected_asset_authorization_rpc.sql`

Follow-up verification showed the linked migration list applied through `20260804004000`; `npx supabase db lint --linked --level warning` reported no schema errors. The push printed a post-apply pg-delta cache warning about a missing local certificate file, but migration state and lint were clean.

Local Supabase validation after the protected asset RPC was green: reset passed, local schema lint passed, and the full pgTAP suite passed 4 files / 66 tests.

## Manifest Supersession

Initial sample fixture:

- `manifest-2026-08-05` was created as an active approved staging manifest for one `AH-026005` `tile_group` route.
- Original storage alias was `hawks-pilot` with metadata `object_path=tiles/dng/2026/AH-026005/ortho/round-corners`.
- DB-side RPC simulation as the platform-admin approver returned the entry.
- Anonymous NGINX tile request returned `401` as expected.

Authorization correction:

- Staging survey `AH-026005` has DNG `client_id=43f7642a-55c0-4778-93bd-ca2acb0962c0`.
- The initial pilot entry had null client/org IDs, so normal DNG users were denied.
- The pilot manifest entry was patched to the DNG client ID.
- DB-side RPC simulation as a real DNG profile then returned the sample tile entry.

Real bucket correction:

- The copied subset was mirrored from temporary `hawks-pilot` into real MinIO bucket `tiles`.
- Approved manifests are immutable, so correction used the supersession workflow.
- `manifest-2026-08-05` and `manifest-2026-08-06` are superseded.
- Active approved manifest is now `manifest-2026-08-07` with `destination_storage_alias=tiles` and metadata `object_path=dng/2026/AH-026005/ortho/round-corners`.

## MinIO Tile Migration

Pilot started with one isolated sample object copied into `hawks-pilot`:

- Source: `public/tiles/dng/2026/AH-026005/ortho/round-corners/11/1739/1067.png`
- Pilot object: `tiles/dng/2026/AH-026005/ortho/round-corners/11/1739/1067.png`

The full `dng/2026/AH-026005` tile folder is about `168,477` PNGs / `6.5 GB`, so the first copy intentionally used one tile before expanding.

Expanded pilot migration copied coherent zoom levels `11` through `23` for `public/tiles/dng/2026/AH-026005/ortho/round-corners`.

Final real-bucket verification:

- Bucket alias: `tiles`
- Object path: `dng/2026/AH-026005/ortho/round-corners`
- Object count: `42,547`
- Size: `2.8GiB`
- Source byte total recorded in manifest verification metadata: `2,977,229,222`
- Temporary `hawks-pilot` bucket and contents were deleted.
- `hawks-assets/tiles` was confirmed empty.

## Smoke-Test Status

Passing checks:

- Anonymous protected tile requests through NGINX return `401`.
- Anonymous protected point-cloud requests through NGINX return `401`.
- DB-side RPC simulation as platform admin returns the pilot manifest entry.
- DB-side RPC simulation as a real DNG profile returns the pilot manifest entry after client authorization correction.

Pending checks:

- Restart Next dev with `PROTECTED_ASSET_STORAGE_TILES_ROOT=tiles`.
- Authenticated direct tile request through NGINX should return `200` for z11 and z23 sample URLs.
- Browser map should render available `AH-026005` tiles through NGINX using the active manifest and real `tiles` bucket.

Sample URLs:

- `/asimov-hawks/tiles/dng/2026/AH-026005/ortho/round-corners/11/1739/1067.png`
- `/asimov-hawks/tiles/dng/2026/AH-026005/ortho/round-corners/23/7125550/4370844.png`

## Troubleshooting Notes

A prior NGINX `500` was caused by `X-Asset-Upstream-URI` missing a leading slash, which produced an invalid upstream such as `minio:9000hawks-pilot/...`. The local fix in `lib/assets/minio-aliases.ts` returns a leading-slash path. After changing the env alias or this helper, restart Next dev before retesting.

If authenticated requests still return `401`, verify cookies are forwarded, `X-Original-URI` matches the `/asimov-hawks/...` asset route, and `manifest-2026-08-07` is active. If authenticated requests return `404` or `502`, inspect NGINX dynamic upstream mapping from `X-Asset-Upstream-URI` to MinIO and verify the `tiles` bucket object prefix exists.
