# Validation Baseline 2026-08-10

Status: current local validation snapshot for the protected asset pilot follow-up.

## Protected Asset Smoke Test

Attempted to restart Next dev with `PROTECTED_ASSET_STORAGE_TILES_ROOT=tiles` and test through external WSL NGINX.

Initial state:

- `curl.exe -I http://localhost:8080/asimov-hawks` returned `502 Bad Gateway`, indicating the app proxy target was not healthy.
- Anonymous z11 and z23 protected tile requests through NGINX returned `500 Internal Server Error` before the dev server was restarted.

Dev restart notes:

- First background start left stale project-local `node.exe` processes and blocked `.next/trace` with `EPERM`.
- Stopped only project-local Next/npm dev processes, after which `.next/trace` no longer existed.
- Clean restart reached `Next.js 15.5.9`, `Ready in 10.6s`, then began compiling `/`.

Current blocker:

- Direct `HEAD` to `http://localhost:3000/asimov-hawks` timed out after 10 seconds with no bytes received.
- NGINX `HEAD` to `http://localhost:8080/asimov-hawks` timed out after 10 seconds with no bytes received.
- NGINX z11/z23 protected tile `HEAD` requests and direct `/asimov-hawks/internal/asset-auth` `HEAD` request timed out after 20 seconds.
- Authenticated browser/NGINX `200` smoke testing remains blocked until the local Next dev server responds reliably.

Sample URLs still pending:

- `/asimov-hawks/tiles/dng/2026/AH-026005/ortho/round-corners/11/1739/1067.png`
- `/asimov-hawks/tiles/dng/2026/AH-026005/ortho/round-corners/23/7125550/4370844.png`

## Application Checks

`npm run lint` failed with the documented lint baseline:

```text
next lint is deprecated and will be removed in Next.js 16.
Key "rules": Key "prefer const": Could not find "prefer const" in plugin "@".
```

`npx tsc --noEmit` failed with existing application TypeScript errors in baseline files, including:

- implicit `any` caller props in `components/callers/*`;
- MapLibre bounds/typing issues in `components/data-table.tsx`, `components/maplibre.tsx`, and map components;
- duplicate JSX attribute and prop mismatch errors in `components/maps/ortho-map.tsx`;
- survey-map `LngLatBoundsLike` and readonly tuple errors;
- helper generic/implicit `any` errors in `lib/helpers.ts`.

No protected-asset helper file was listed in the TypeScript error output.

`npm run build` failed at the known heap baseline:

```text
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
Next.js build worker exited with code: 134 and signal: null
```

## DB Checks

No new Supabase checks were run in this pass. The active compressed state still records the latest green DB baseline: local reset/lint/full pgTAP pass with 4 files / 66 tests and linked staging migrations through `20260804004000` applied with linked schema lint clean.

## Next Validation Step

Diagnose why local Next dev hangs while compiling or serving `/` and `/internal/asset-auth`, then rerun the protected z11/z23 tile smoke tests through NGINX with a valid authenticated browser session.
