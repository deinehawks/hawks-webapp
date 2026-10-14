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
