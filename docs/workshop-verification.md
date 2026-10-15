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

## Local workshop visibility — 14 October 2026

Requested selection: BARBCO2026 AH-0260001/AH-0260002/AH-0260003 only; hide DNG
AH-026005 and other existing surveys. Keep all existing accounts usable.

Implemented a reloadable local configuration, survey/client/detail/analytics
filters, file URL guards, and an empty sidebar state. Workshop assets revalidate
their cache; disabling the configuration restores normal visibility. Production
traces explicitly include the small runtime config and exclude dataset files.

36 tests passed, including mocked server-action checks that verify hidden data
is not returned and existing per-account authorization remains in force.
Strict TypeScript checks passed for the visibility helper and supporting config.
No Supabase write operation or local dataset change was performed.

Production build passed. Startup reported Ready in 451 ms. All three selected
PNG samples returned 200 and ETag revalidation returned 304. Existing local PNG
files for AH-026012/AH-026013 returned no-store 404s, including HEAD and range
requests. DNG AH-026005 also returned 404. The login page remains available and
PCD requests still require authentication. Runtime config is present in server
traces; dataset references remain zero.

## BSBG orthomap tile folders — 14 October 2026

Read-only inspection confirmed AH-026033 through AH-026037 are configured for
round-corners and have only that local export. The orthomap still hardcoded
sharp-corners in its active raster sources and alternate raster helper.

Both URL templates now use each survey's resolved ortho.tile_folder, matching
the individual survey view. Added that optional metadata to the orthomap's
survey type. No Supabase updates or dataset moves were performed.

The changed TSX file passed transpilation. Real tile samples at zooms 11 and 18
for all five BSBG surveys returned 200 and matched local bytes (ten requests).


## MCS point-cloud conversion - 15 October 2026

The original MCS binary exports use CRLF headers, float32 XYZ and separate
float64 red/green/blue fields. The installed three-stdlib PCDLoader starts their
binary payload one byte early and ignores those color fields. They also require
full downloads of 2,340,486,696 bytes / 65,013,514 points (AH-026010) and
2,870,247,828 bytes / 79,729,101 points (AH-026011).

Prepared evenly sampled copies with 4,000,000 points each, LF headers, float32
XYZ and packed RGB. Each output is 64,000,225 bytes. The original coordinates
are retained; density is reduced for workshop viewing. Full-resolution files
are preserved beside the active odm.pcd files as odm.original.pcd.

Both complete outputs loaded successfully using the app's installed PCDLoader,
with 4,000,000 positions and colors and finite bounding boxes/spheres. For each
output, 257 samples spread across the source matched original XYZ exactly and
RGB within Float32 rounding. Local parse plus sample verification took about
0.62 seconds per model; this is a Node measurement, not a browser-render timing.

The converter's fixture tests cover CRLF/RGB compatibility through the real
loader, sampling, original preservation, existing-output protection, malformed
payload/layout rejection and incomplete-output cleanup. No Supabase updates,
frontend code changes, or dependency additions are required. Signed-in visual
verification remains with the user.


## Overlapping surveys and orthomap isolation - 15 October 2026

Dashboard clicks now resolve all matching survey IDs, deduplicate repeated
features and offer an overlap chooser. The orthomap uses the same chooser for
boundary clicks in the explicit All surveys overview. Its default selection is
the first survey ordered by ID, with a persistent survey identity and an
overview stacking list.

Individual selection mounts only that survey's raster source and filters
boundaries, labels, detections, feature counts and interactions by survey ID
(detection areaCode). Switching clears old popups/hover state and refits bounds;
the map instance and base style stay mounted. Layer ordering restores ascending
survey-ID stacking after switches and keeps boundaries/labels above imagery
without a styledata move loop. Loading status tracks active source IDs and
reports active imagery errors without substituting another survey's data.

50 tests passed. The new regression coverage exercises real component callbacks
with hook/map adapters, including selecting either overlapping survey, single
and empty clicks, boundary toggles, default/fallback selection, overview order,
tile paths, overlay filtering, popup resets, loading/error resets and optional
chooser metadata. Strict TypeScript checks passed for the orthomap, shared
chooser, selection helper and affected store. The legacy dashboard retains
pre-existing TypeScript issues; the production configuration already skips
global type checking and linting.

The verification tools cannot access the user's signed-in browser session.
Manual rehearsal remains: select both MCS surveys from an overlap; switch
orthomap imagery and inspect IDs/tile requests/counts; test overview, pan/zoom,
boundary visibility and another client. No Supabase write or dataset change is
part of this feature.

Production build passed (54-second compilation). The 17 generated trace manifests
contained 1,565 entries and zero workshop-data references; the runtime visibility
config remained included. Production startup reported Ready in 483 ms. Login
returned 200, anonymous PCD HEAD remained a 307 login redirect, and 12 repeated
PNG requests across MCS AH-026010/AH-026011, BSBG AH-026033 and BARBCO AH-0260001
returned 200 with exact local bytes. Development mode was restored on port 3000.

The dashboard gained no new TypeScript diagnostics compared with the committed
baseline (16 remaining versus 18 baseline). Final type-only annotations preserve
the exact JavaScript validated by the production build.


## Survey popup and orthomap UI refinement - 15 October 2026

Replaced duplicated survey-detail cards with a shared details component and
popup shell. The shell owns a single scoped MapLibre surface, custom accessible
close button, viewport/map size limits, keyboard propagation, focus entry and
restoration, and a 120 ms opacity animation disabled for reduced motion.
Chooser rows use shadcn ghost buttons. Metadata dates/areas share formatters;
missing measurements remain unavailable rather than becoming zero.

The compact card header now contains organization, persistent Viewing identity
and the map controls. Combined imagery and a Layers popover replace the expanded
overview explanation/list. Mobile controls use 40-44 px targets; status feedback
is a small footer. Raster sources, selection/filtering, stacking and map instance
behavior remain unchanged. CSS is scoped to survey popups; plant popups and the
global theme are unaffected. No dependency or Supabase update was added.

54 tests passed, including metadata formatting, shared details/one-link action,
Escape handling, chooser actions, toolbar toggles, and all previous map/data
regressions. Targeted strict TypeScript checks passed for the changed orthomap,
shared popup components, mode toggle and formatter.

An isolated headless Edge preview used the actual project React, shadcn, Radix
and MapLibre components, read-only MCS survey metadata and the existing local tile
routes. It did not access or change the user's authenticated browser session.
Browser checks passed at 1440x900, 768x1024 and 375x844: no horizontal overflow,
map height at least 320 px, mobile button targets 40-44 px, selected survey
switching, Layers ordering/Top marker, Escape and focus return, chooser keyboard
activation, a single details anchor, long-location scrolling, dark popup colors,
reduced motion, and a synthetic 16-row chooser list. The completed browser run
reported zero JavaScript runtime exceptions. Screenshots were visually inspected
for desktop layering, mobile header/popups and dark long-content presentation.
Temporary preview tools were stopped after verification.

Production build passed with a 64-second compilation; its existing configuration
skips global type validation/linting, so the targeted strict checks above were
run separately. Production startup reported Ready in 547 ms. All 17 trace
manifests exclude workshop-data and include the runtime visibility config.
Login returned 200, both real MCS PNG samples returned 200 with matching local
bytes, and anonymous PCD HEAD retained the 307 login redirect. The final suite
passed all 54 tests. Development mode was restored on port 3000.


## Detection label compatibility - 15 October 2026

The shared object-detection JSON loader now normalizes healthy banana aliases
in memory before returning records to dashboard, orthomap and survey pages.
Both Banana Plant (Healthy-looking) and Banana Plant (Healthy Looking) are
accepted, including repeated whitespace and capitalization differences. Only
this known class is normalized; other labels, IDs, bounding boxes and survey
scoping remain intact. Uploaded JSON and Supabase are not modified.

58 tests passed. New coverage checks mixed-format healthy counts and existing
point/line overlays, unknown/infected labels, metadata/source preservation and
the actual JSON-loading server action with workshop and per-survey filters.

Extended detection compatibility to Banana Plant (Unhealthy looking), including
hyphenated/case/whitespace variants and the user's exact double-space spelling.
These normalize to the existing Banana Plant (Infected) class, so unhealthy
counts, overlays and statistics use the same path as older exports. Healthy
aliases remain separate; original records and uploaded JSON are preserved.
All 59 tests passed, including mixed healthy/infected/unhealthy exports and
server-action survey scoping.
