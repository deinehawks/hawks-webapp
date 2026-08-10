# Validation Baseline 2026-08-10

Status: current local validation snapshot for the protected asset pilot follow-up.

## Protected Asset Smoke Test

Protected asset smoke testing is now green for the current local NGINX and staging-manifest pilot path.

Passing checks:

- Login works at `http://localhost:8080/asimov-hawks/auth/login`.
- Authenticated direct z11 and z23 protected tile URLs succeed through NGINX.
- The webapp orthomap renders `AH-026005` tiles after switching the tile-folder lookup to `survey.ortho?.tile_folder ?? "round-corners"`.
- The survey 3D tab loads the protected ODM point cloud after restarting Next with `PROTECTED_ASSET_STORAGE_POINTCLOUDS_ROOT=pointclouds`.
- Anonymous protected tile and point-cloud requests return `401`.
- Malformed direct point-cloud URLs with a double leading slash are denied as `malformed_request`.

Active manifest under test:

- `manifest-2026-08-10`
- Tile object path: `dng/2026/AH-026005/ortho/round-corners`
- Point-cloud object path: `dng/2026/AH-026005/point-clouds/odm.pcd`

## Application Checks

`npm run lint` still fails with the documented lint baseline:

```text
next lint is deprecated and will be removed in Next.js 16.
Key "rules": Key "prefer const": Could not find "prefer const" in plugin "@".
```

`npx tsc --noEmit` still fails with existing application TypeScript baseline errors in map, caller, and helper files.

`npm run build` still fails at the known heap baseline:

```text
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
Next.js build worker exited with code: 134 and signal: null
```

## DB Checks

No new Supabase checks were run in this pass. The current green DB baseline remains: local reset/lint/full pgTAP pass with 4 files / 66 tests and linked staging migrations through `20260804004000` applied with linked schema lint clean.

## Next Validation Step

Run a short documented workshop smoke baseline that captures one clean login flow, one orthomap flow, one 3D flow, and one anonymous fail-closed check against active staging manifest `manifest-2026-08-10`.
