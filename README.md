# ASIMOV-HAWKS Web Application

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Install Dependencies

To install the required dependencies, run:

```bash
npm install
```

### Run the Development Server

To start the development server, use the following command:

```bash
npm run dev
```

Open [http://localhost:3000/asimov-hawks](http://localhost:3000/asimov-hawks) with your browser to view the application.

## Additional Notes

- If you encounter issues with dependencies during installation, using the `--legacy-peer-deps` flag is a safe workaround.
- If a Turbopack related error surfaces after starting the development server, delete the `.next` directory and start the server again.
  Otherwise, remove the --turbopack flag in the start command. Note that removing the turbopack flag will significantly slow down the compilation process of the source code.

## Local workshop datasets

Tiles and point clouds live outside `public` so production startup does not
index every dataset file:

```text
public/                 # Logos, icons, animations
workshop-data/
  tiles/                # Same folders previously under public/tiles
  3d/                   # Same folders previously under public/3d
```

The app serves these directories on demand at the existing
`/asimov-hawks/tiles/...` and `/asimov-hawks/3d/...` URLs. One Next.js process
serves both the application and the local files. Keep the dataset directories
on disk alongside the project; they are ignored by Git and excluded from build
traces, TypeScript discovery, and ESLint. No cloud storage is needed.

Some old datasets were already tracked despite the ignore rules. After moving
them, Git shows their old public paths as deleted; the actual files remain in
the ignored workshop-data directory. The code repository alone is not a backup
or distribution package for the local datasets.

Next.js 15 applies normal trace exclusions after its initial Webpack file scan.
The config also adds an early ignore to its Node.js tracing plugin, preventing
that initial scan from enumerating the dataset. This integration is checked by
a regression test and fails with a clear message if a Next.js upgrade changes
the plugin; recheck it when upgrading Next.js.

### Prepare and run the workshop

Stop any `npm run dev` or `npm run start` process first (Ctrl+C in its terminal).
From the project directory, run:

```bash
npm run prepare:workshop-data
npm run build
npm run start
```

On Windows PowerShell, use `npm.cmd` in place of `npm` if execution policy blocks
`npm.ps1`.

The preparation command renames both directories on the same drive without
enumerating or copying their files. It checks both destinations before moving
either, refuses links and conflicting destinations, and can safely be rerun.
If a move fails, no files are deleted; completed moves stay in
`workshop-data`. Resolve the reported problem and rerun the command. Do not
create junctions back into `public`, because Next.js would scan them again.

Open http://localhost:3000/asimov-hawks/auth/login. Rehearse the orthomosaic
views and both ODM/LiDAR point-cloud views before the workshop. Supabase login
and database access still need their existing network connection; moving local
files does not make the whole application offline.

For new data, put tiles directly in `workshop-data/tiles` and point clouds in
`workshop-data/3d`, preserving the existing hierarchy. Survey metadata prefers
the configured tile folder when it exists locally; if missing, it tries the
available `round-corners` and `sharp-corners` exports using directory checks. No rebuild is needed
for new dataset files. Browser responses are cached privately for one hour;
after replacing a file at the same URL, disable browser caching in DevTools
and reload if you need to see the replacement immediately.

`npm run update-tile-bounds` now reads from `workshop-data/tiles`. It still
updates Supabase and is **not** part of preparation or the build.

### Verification

```bash
npm run test:workshop
```

Tests use small temporary fixtures, never the real dataset or Supabase.
The test command uses Node's built-in TypeScript stripping (Node 22.18+ or 24;
this workspace uses Node 24). It checks streaming/backpressure/cancellation,
cache validation, HEAD/range responses, path protection, zoom discovery, and
migration conflicts/idempotency.

### Roll back

Stop the app. Restore the application code from before the workshop-data
change, including its original `public/tiles` lookup. Then, in PowerShell from
the project directory, run the following checks and same-drive renames:

```powershell
$projectRoot = (Get-Location).ProviderPath
$publicRoot = Join-Path $projectRoot 'public'
$datasetRoot = Join-Path $projectRoot 'workshop-data'
$datasets = @('tiles', '3d')
foreach ($dataset in $datasets) {
  $source = [IO.Path]::GetFullPath((Join-Path $datasetRoot $dataset))
  $destination = [IO.Path]::GetFullPath((Join-Path $publicRoot $dataset))
  if (-not $source.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar) -or
      -not $destination.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar)) {
    throw 'Dataset paths must stay inside the project.'
  }
  if (-not (Test-Path -LiteralPath $source -PathType Container)) {
    throw "Source dataset missing: $dataset"
  }
  if (Test-Path -LiteralPath $destination) {
    throw "Destination already exists: $dataset"
  }
  if (((Get-Item -LiteralPath $source).Attributes -band [IO.FileAttributes]::ReparsePoint) -or
      ((Get-Item -LiteralPath $datasetRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) -or
      ((Get-Item -LiteralPath $publicRoot).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'Rollback refuses directory links.'
  }
}
foreach ($dataset in $datasets) {
  [IO.Directory]::Move((Join-Path $datasetRoot $dataset), (Join-Path $publicRoot $dataset))
}
```

Rebuild and start the restored app. Never overwrite an existing destination or
delete either copy to resolve a conflict.

## Workshop survey visibility

`config/workshop-visibility.json` controls which surveys this local app exposes:

```json
{
  "enabled": true,
  "visibleSurveys": {
    "BARBCO2026": [
      "AH-0260001",
      "AH-0260002",
      "AH-0260003"
    ]
  }
}
```

Workshop filtering is enabled with only those three surveys. All other surveys
are hidden, including BARBCO2026's AH-026012/AH-026013 and DNG's AH-026005.
Accounts remain usable and authenticate normally; an account with no selected
surveys sees an empty dashboard/sidebar. Existing per-account authorization
still applies, so this list cannot give a user access to another client's
survey page.

The same list filters dashboard/sidebar data, client listings, direct survey
pages, object-detection analytics, and local tile/point-cloud file routes.
Unlisted local file paths return 404 (PCD requests still require the existing
login check first). No database record, storage object, local dataset, or account
is removed or updated.

### Add tomorrow's workshop data

After adding your user and survey data through your existing setup process,
append the new survey IDs under their client/access code in
`visibleSurveys`. To show DNG's new surveys, add a `"DNG"` entry containing
only the new IDs; omit AH-026005 to keep that older survey hidden. Put the new
tile/PCD files in their normal `workshop-data` directories.

The server reloads this small JSON file when it changes, without a rebuild or
restart. Refresh the browser after editing to replace existing page/navigation
data. Workshop file responses revalidate using ETags so policy edits take effect
on later requests. Use a hard refresh with browser caching disabled once if
older imagery is still cached from before workshop filtering was enabled.

Set `"enabled": false` and refresh to restore normal per-account visibility.
An enabled empty list hides all surveys. A missing or invalid config hides all
surveys and logs a configuration error until the file is repaired.

This is a local app visibility filter. It does not change Supabase accounts,
RLS rules, dashboard visibility, or the existing public detected-objects bucket.


## Browser-compatible MCS point clouds

MCS AH-026010 and AH-026011 now use 4,000,000-point workshop copies at their
existing `workshop-data/3d/mcs/2026/<survey-id>/odm.pcd` paths. Each is about
64 MB. The complete, full-resolution input is preserved beside it as
`odm.original.pcd`. Preview copies use evenly spaced source points, so they
retain the original coordinates and colors at a lower density; they are for
viewing, not full-resolution analysis.

The converter fixes the MCS export's CRLF headers and separate float64 color
channels by writing LF headers, float32 XYZ, and packed RGB. It reads with small,
bounded buffers, validates the source layout/length and sampled values, and
refuses to overwrite any output. It supports this specific MCS binary layout.

To prepare a new copy without modifying the source:

```powershell
npm run prepare:workshop-pcd -- workshop-data/3d/mcs/2026/<survey-id>/odm.pcd workshop-data/3d/mcs/2026/<survey-id>/odm.web.pcd 4000000
```

Validate the output before activation. To activate it at the existing URL,
first rename the input to `odm.original.pcd`, then rename the new output to
`odm.pcd`; both destination names must be absent before their respective
renames. Never overwrite an existing backup. Refresh the 3D page after replacing
the file; dataset-only changes do not require a rebuild.

To restore full-resolution data, stop the app, rename the workshop `odm.pcd`
to an unused preview filename, then rename `odm.original.pcd` back to
`odm.pcd`. The original MCS exports still need conversion to work with the
current browser loader.


## Overlapping surveys and orthomap selection

Click an overlapping area on the dashboard to choose a survey by its ID, area
label, flight date and available area measurement. A single match opens its
details directly; clicking empty map space dismisses the survey popup.

The orthomap opens with the first survey ordered by ID (AH-026010 for MCS).
Use the Survey dropdown to switch. The persistent Viewing label identifies the
active imagery, and boundaries, detection overlays and detection counts follow
the same selection. Switching clears old popups and fits the chosen area while
keeping the map mounted and preserving crop-status and analysis/inventory mode.

All surveys is an explicit overview that combines the available imagery. Its
notice lists imagery layers from top to bottom; ascending IDs are drawn first,
so the highest listed ID is above lower IDs in overlaps. With Show Boundaries
enabled, clicking an overlap opens the chooser; choosing a row isolates that
survey. Individual mode never substitutes another survey's tiles when imagery
is missing. Selection lasts for the current page only.


The survey chooser and detail popups share a compact, theme-aware surface.
They show survey IDs first, format flight dates as `02 Jun 2026`, and use
consistent area values. Escape closes a focused popup and returns focus to its
previous control or the map. Long content scrolls inside the popup.

Orthomap controls now live in the map card header. In overview mode,
**Combined imagery** identifies the view; **Layers (n)** opens the drawing-order
list. The footer reports **Loading imagery…**, **Ready**, **No imagery**, or
**Some imagery unavailable**. Controls wrap on small screens without changing
the selected survey, overlays or map instance.
