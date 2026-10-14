# Workshop verification — 14 October 2026

Environment: Windows, Node 24.21.0, Next.js 15.5.9.

- Both datasets were renamed into `workshop-data`; rerunning preparation reports
  both as already prepared. The source datasets were not copied or deleted.
- `npm run test:workshop`: 20 tests passed.
- Strict TypeScript checks passed for the new file helper, zoom helper, and
  Next.js config. The existing build config still skips whole-project type
  validation and linting.
- `npm run build`: passed with the default Node heap limit. The build reports
  Supabase Edge Runtime compatibility warnings and Webpack cache snapshot
  warnings.
- An initial build hit the 4 GB heap limit because the initial file tracer
  globbed the runtime dataset before normal exclusions were applied. The early
  Webpack tracer ignore resolves that issue; a regression test checks it before
  enumeration.
- Inspected 17 production trace manifests: zero `workshop-data` references.
- `npm run start`: Next.js reported **Ready in 522 ms**.
- Production login page returned 200.
- A real PNG tile matched the source bytes. HEAD returned its length; ETag
  validation returned 304; a byte range returned 206 and matching bytes.
- Invalid ranges returned 416; missing files and a Windows separator traversal
  probe returned 404. Error responses had `Cache-Control: no-store`.
- 32 concurrent production tile requests all returned matching bytes with no
  failures.
- Unauthenticated production `.pcd` requests still redirect to login (307).
  Direct helper verification of a real 58,328,382-byte ODM file returned correct
  HEAD metadata and a matching 128-byte range without buffering the whole file.
- The local 3D dataset contains eight `odm.pcd` files and no `lidar.pcd` files.
  LiDAR file serving uses the same handler but could not be checked against a
  real LiDAR dataset.

## Manual rehearsal still needed

Sign in at http://localhost:3000/asimov-hawks/auth/login and check orthomosaic
panning/zooming and the available ODM point-cloud views. The verification tools
do not have access to the user's signed-in browser session.

## Survey tile-folder correction — 14 October 2026

The user's signed-in rehearsal showed AH-0260001 working while AH-0260002 and
AH-0260003 returned tile 404s. Read-only inspection found all three database
records configured for `round-corners`, but only AH-0260001 had that local
export; the other two had `sharp-corners` only.

Both survey-detail actions and the survey-list action now resolve the available
local variant before returning metadata to the browser. They prefer the
configured folder when present, otherwise check the two known exports. This
uses only immediate directory checks, without copying data or updating Supabase.

- Regression coverage reproduces the three surveys' folder layouts.
- 22 tests passed, including the existing tracing, streaming, and migration tests.
- Strict helper/config TypeScript checks passed.
- Sample requests for all three surveys returned 200 and matched local bytes.

- The updated production build passed; its server trace manifests still exclude
  the runtime dataset. Development mode was restored after build validation.

## Base-map correction — 14 October 2026

The survey and orthomap views used the French HOT tile endpoint, which timed out
in two checks from this machine. The standard OpenStreetMap endpoint returned
HTTP 200 and a valid 256×256 PNG when checked with application identification and
the local application's Referer.

- Switched survey/orthomap base maps to the standard endpoint already used by
  the dashboard.
- Set all four raster base-map sources to maxzoom 19 so MapLibre overzooms
  available base tiles while local imagery remains usable at higher zoom.
- All four changed TSX files passed transpilation checks; the raster style passed
  MapLibre style validation.
- Development hot reload picks up the changes. Signed-in visual verification
  remains with the user; OSM tiles still require internet access.

## Aerial imagery zoom visibility — 14 October 2026

The user clarified that local imagery disappeared while zooming out. The survey
view explicitly hid its raster source and layer below zoom 15, despite BARBCO
tiles being available down to zoom 11.

Survey and orthomap views now allow map zoom 11–23, with aerial source/layer
visibility starting at 11. The orthomap's unused raster helper was aligned and
its duplicate maxzoom attribute removed. Both TSX files passed transpilation,
the raster style passed MapLibre validation, and zoom-11 samples for all three
BARBCO surveys returned 200 with matching local bytes.
