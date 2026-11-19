# Validation Baseline 2026-08-10

Status: current local validation snapshot for the protected asset pilot follow-up.

## Workshop Smoke Baseline

Recorded on 2026-08-10 against local NGINX at `http://localhost:8080` with active staging manifest `manifest-2026-08-10`.

Successful workshop-path flows:

- Login flow: `http://localhost:8080/asimov-hawks/auth/login` loads and the authenticated app session works through local NGINX.
- Orthomap flow: authenticated direct z11 and z23 protected tile URLs succeed, and the survey orthomap renders `AH-026005` tiles after using `survey.ortho?.tile_folder ?? "round-corners"`.
- 3D flow: the survey 3D tab loads the protected ODM point cloud for `AH-026005` after restarting Next with `PROTECTED_ASSET_STORAGE_POINTCLOUDS_ROOT=pointclouds`.
- Fail-closed flow: anonymous protected tile and point-cloud requests return `401`.

Negative-path note:

- A malformed direct URL with a double leading slash, `//asimov-hawks/3d/dng/2026/AH-026005/odm.pcd`, is denied as `malformed_request` before upstream access.

Active manifest under test:

- `manifest-2026-08-10`
- Tile object path: `dng/2026/AH-026005/ortho/round-corners`
- Point-cloud object path: `dng/2026/AH-026005/point-clouds/odm.pcd`

## Protected Asset Smoke Test

Protected asset smoke testing is green for the current local NGINX and staging-manifest pilot path.

Passing checks:

- Login works at `http://localhost:8080/asimov-hawks/auth/login`.
- Authenticated direct z11 and z23 protected tile URLs succeed through NGINX.
- The webapp orthomap renders `AH-026005` tiles after switching the tile-folder lookup to `survey.ortho?.tile_folder ?? "round-corners"`.
- The survey 3D tab loads the protected ODM point cloud after restarting Next with `PROTECTED_ASSET_STORAGE_POINTCLOUDS_ROOT=pointclouds`.
- Anonymous protected tile and point-cloud requests return `401`.
- Malformed direct point-cloud URLs with a double leading slash are denied as `malformed_request`.

## Application Checks

`npm run lint` now runs successfully and exits with warnings only after the flat-config fix and the follow-up cleanup pass. Error-level issues in `components/maps/ortho-map.tsx`, `components/maps/survey-map.tsx`, and `components/survey-page-components/data-tab.tsx` are cleared.

Current lint warnings are concentrated in three categories:

- `@typescript-eslint/no-explicit-any` in map-heavy and helper modules.
- `no-console` in protected asset, map, action, and helper files.
- a small number of hook dependency warnings in `components/maps/ortho-map.tsx`.

`npx tsc --noEmit` still fails with existing application TypeScript baseline errors in map, caller, and helper files.

`npm run build` still fails at the known heap baseline:

```text
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
Next.js build worker exited with code: 134 and signal: null
```

## DB Checks

No new Supabase checks were run in this pass. The current green DB baseline remains: local reset/lint/full pgTAP pass with 4 files / 66 tests and linked staging migrations through `20260804004000` applied with linked schema lint clean.

## Next Validation Step

Decide whether to continue warning-only lint cleanup or shift effort to the TypeScript baseline.
