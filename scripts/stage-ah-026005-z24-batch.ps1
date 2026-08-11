param(
  [Parameter(Mandatory = $false)]
  [ValidateRange(1, 25)]
  [int]$BatchNumber,

  [Parameter(Mandatory = $false)]
  [switch]$ListBatches,

  [Parameter(Mandatory = $false)]
  [switch]$OpenOutput,

  [Parameter(Mandatory = $false)]
  [string]$SourceRoot = "public/tiles/dng/2026/AH-026005/ortho/round-corners/24",

  [Parameter(Mandatory = $false)]
  [string]$OutputRoot = ".tmp/minio-stage/AH-026005-round-corners-z24"
)

$ErrorActionPreference = "Stop"

function Get-BatchDefinitions {
  @(
    @{ Number = 1; Start = "14251101"; End = "14251125"; Note = "normal" }
    @{ Number = 2; Start = "14251126"; End = "14251150"; Note = "normal" }
    @{ Number = 3; Start = "14251151"; End = "14251175"; Note = "normal" }
    @{ Number = 4; Start = "14251176"; End = "14251200"; Note = "normal" }
    @{ Number = 5; Start = "14251201"; End = "14251225"; Note = "normal" }
    @{ Number = 6; Start = "14251226"; End = "14251250"; Note = "normal" }
    @{ Number = 7; Start = "14251251"; End = "14251275"; Note = "normal" }
    @{ Number = 8; Start = "14251276"; End = "14251300"; Note = "normal" }
    @{ Number = 9; Start = "14251301"; End = "14251325"; Note = "normal" }
    @{ Number = 10; Start = "14251326"; End = "14251350"; Note = "normal" }
    @{ Number = 11; Start = "14251351"; End = "14251375"; Note = "normal" }
    @{ Number = 12; Start = "14251376"; End = "14251400"; Note = "normal" }
    @{ Number = 13; Start = "14251401"; End = "14251425"; Note = "normal" }
    @{ Number = 14; Start = "14251426"; End = "14251450"; Note = "normal" }
    @{ Number = 15; Start = "14251451"; End = "14251470"; Note = "normal" }
    @{ Number = 16; Start = "14251471"; End = "14251480"; Note = "heavy" }
    @{ Number = 17; Start = "14251481"; End = "14251490"; Note = "heavy" }
    @{ Number = 18; Start = "14251491"; End = "14251500"; Note = "heavy" }
    @{ Number = 19; Start = "14251501"; End = "14251510"; Note = "heavy" }
    @{ Number = 20; Start = "14251511"; End = "14251520"; Note = "heavy" }
    @{ Number = 21; Start = "14251521"; End = "14251525"; Note = "heavy" }
    @{ Number = 22; Start = "14251526"; End = "14251545"; Note = "light-tail" }
    @{ Number = 23; Start = "14251546"; End = "14251565"; Note = "light-tail" }
    @{ Number = 24; Start = "14251566"; End = "14251585"; Note = "light-tail" }
    @{ Number = 25; Start = "14251586"; End = "14251590"; Note = "light-tail" }
  )
}

function Resolve-AbsolutePath([string]$PathValue) {
  $resolved = Resolve-Path -LiteralPath $PathValue
  return $resolved.Path
}

function Ensure-Directory([string]$PathValue) {
  if (-not (Test-Path -LiteralPath $PathValue)) {
    New-Item -ItemType Directory -Path $PathValue | Out-Null
  }
}

function Get-BatchFolders([string]$StartName, [string]$EndName) {
  $allFolders = Get-ChildItem -LiteralPath $script:ResolvedSourceRoot -Directory |
    Sort-Object Name |
    Where-Object { $_.Name -ge $StartName -and $_.Name -le $EndName }

  if (-not $allFolders) {
    throw "No source folders found between $StartName and $EndName."
  }

  return $allFolders
}

function Copy-BatchFolder([string]$FolderName, [string]$BatchStage24Path) {
  $sourceFolder = Join-Path $script:ResolvedSourceRoot $FolderName
  $targetFolder = Join-Path $BatchStage24Path $FolderName
  Ensure-Directory $targetFolder

  $null = robocopy $sourceFolder $targetFolder /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
  $robocopyExit = $LASTEXITCODE

  if ($robocopyExit -ge 8) {
    throw "robocopy failed for $FolderName with exit code $robocopyExit."
  }
}

function Get-FolderStats([System.IO.DirectoryInfo[]]$Folders) {
  $stats = foreach ($folder in $Folders) {
    $measure = Get-ChildItem -LiteralPath $folder.FullName -Recurse -File |
      Measure-Object Length -Sum

    [pscustomobject]@{
      Name = $folder.Name
      FileCount = $measure.Count
      TotalBytes = $measure.Sum
    }
  }

  $totalFiles = ($stats | Measure-Object FileCount -Sum).Sum
  $totalBytes = ($stats | Measure-Object TotalBytes -Sum).Sum

  return [pscustomobject]@{
    PerFolder = $stats
    TotalFiles = $totalFiles
    TotalBytes = $totalBytes
  }
}

$batches = Get-BatchDefinitions

if ($ListBatches) {
  $batches | ForEach-Object {
    "{0:D2}: {1} - {2} ({3})" -f $_.Number, $_.Start, $_.End, $_.Note
  }
  exit 0
}

if (-not $BatchNumber) {
  throw "Provide -BatchNumber 1..25, or use -ListBatches."
}

$selectedBatch = $batches | Where-Object { $_.Number -eq $BatchNumber }
if (-not $selectedBatch) {
  throw "Unknown batch number: $BatchNumber"
}

$script:ResolvedSourceRoot = Resolve-AbsolutePath $SourceRoot
Ensure-Directory $OutputRoot
$resolvedOutputRoot = Resolve-Path -LiteralPath $OutputRoot

$batchFolders = Get-BatchFolders -StartName $selectedBatch.Start -EndName $selectedBatch.End
$stats = Get-FolderStats -Folders $batchFolders

$batchStageName = "batch-{0:D2}_{1}-{2}" -f $selectedBatch.Number, $selectedBatch.Start, $selectedBatch.End
$batchStageRoot = Join-Path $resolvedOutputRoot.Path $batchStageName
$batchStage24Path = Join-Path $batchStageRoot "24"

Ensure-Directory $batchStageRoot
Ensure-Directory $batchStage24Path

foreach ($folder in $batchFolders) {
  Copy-BatchFolder -FolderName $folder.Name -BatchStage24Path $batchStage24Path
}

$manifest = [pscustomobject]@{
  batch_number = $selectedBatch.Number
  note = $selectedBatch.Note
  source_root = $script:ResolvedSourceRoot
  staged_root = $batchStageRoot
  staged_upload_folder = $batchStage24Path
  destination_prefix = "tiles/dng/2026/AH-026005/ortho/round-corners/24"
  start_folder = $selectedBatch.Start
  end_folder = $selectedBatch.End
  folder_count = $batchFolders.Count
  file_count = $stats.TotalFiles
  total_bytes = $stats.TotalBytes
  folders = $stats.PerFolder
}

$manifestPath = Join-Path $batchStageRoot "batch-manifest.json"
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath

Write-Host ""
Write-Host ("Staged batch {0:D2}: {1} - {2} ({3})" -f $selectedBatch.Number, $selectedBatch.Start, $selectedBatch.End, $selectedBatch.Note)
Write-Host "Source root:"
Write-Host "  $script:ResolvedSourceRoot"
Write-Host "Upload this folder into the MinIO prefix that maps to:"
Write-Host "  tiles/dng/2026/AH-026005/ortho/round-corners"
Write-Host "Staged upload folder:"
Write-Host "  $batchStage24Path"
Write-Host ("Folder count: {0}" -f $batchFolders.Count)
Write-Host ("File count:   {0}" -f $stats.TotalFiles)
Write-Host ("Total bytes:  {0}" -f $stats.TotalBytes)
Write-Host "Batch manifest:"
Write-Host "  $manifestPath"
Write-Host ""
Write-Host "After upload, verify MinIO is healthy before staging the next batch."

if ($OpenOutput) {
  Start-Process explorer.exe $batchStageRoot
}
