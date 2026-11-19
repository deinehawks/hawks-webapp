[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet("start", "status", "stop")]
  [string]$Action = "status",
  [string]$Config
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$WorkRoot = Join-Path $ProjectRoot ".tmp\workshop-assets\runner"
$LockPath = Join-Path $WorkRoot "uploader.lock"
$StopPath = Join-Path $WorkRoot "stop.requested"
$StatusPath = Join-Path $WorkRoot "status.json"
New-Item -ItemType Directory -Path $WorkRoot -Force | Out-Null

function Read-RunnerStatus {
  if (-not (Test-Path -LiteralPath $StatusPath)) { return $null }
  return Get-Content -LiteralPath $StatusPath -Raw | ConvertFrom-Json
}

function Get-RunningProcess {
  $state = Read-RunnerStatus
  if ($null -eq $state -or $null -eq $state.pid) { return $null }
  return Get-Process -Id ([int]$state.pid) -ErrorAction SilentlyContinue
}

if ($Action -eq "status") {
  $state = Read-RunnerStatus
  $process = Get-RunningProcess
  if ($null -eq $state) {
    Write-Output "Workshop uploader: idle (no previous run)."
    exit 0
  }
  Write-Output ("Workshop uploader: " + $(if ($null -ne $process) { "running" } else { "stopped" }))
  $state | ConvertTo-Json -Depth 5
  if (Test-Path -LiteralPath $state.stdoutLog) {
    Write-Output "Recent output:"
    Get-Content -LiteralPath $state.stdoutLog -Tail 20
  }
  if (Test-Path -LiteralPath $state.stderrLog) {
    $errors = Get-Content -LiteralPath $state.stderrLog -Tail 20
    if ($errors) {
      Write-Output "Recent errors:"
      $errors
    }
  }
  exit 0
}

if ($Action -eq "stop") {
  $process = Get-RunningProcess
  if ($null -eq $process) {
    Write-Output "Workshop uploader is not running."
    Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue
  } else {
    New-Item -ItemType File -Path $StopPath -Force | Out-Null
    Write-Output ("Stop requested for PID " + $process.Id + "; the current batch will finish first.")
  }
  exit 0
}

if ([string]::IsNullOrWhiteSpace($Config)) {
  throw "start requires -Config pointing to a frozen reviewed jobs file."
}
$ConfigPath = (Resolve-Path -LiteralPath $Config).Path
$SidecarPath = "$ConfigPath.sha256"
if (-not (Test-Path -LiteralPath $SidecarPath)) {
  throw "Missing integrity sidecar: $SidecarPath"
}
$configValue = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
if ($configValue.reviewed -ne $true -or $configValue.workflowVersion -ne 1) {
  throw "Only a frozen, reviewed workflowVersion 1 config can start."
}
$expectedHash = (Get-Content -LiteralPath $SidecarPath -Raw).Trim().ToUpperInvariant()
$actualHash = (Get-FileHash -LiteralPath $ConfigPath -Algorithm SHA256).Hash.ToUpperInvariant()
if ($expectedHash -ne $actualHash) {
  throw "Reviewed config hash mismatch. Freeze the generated config again."
}

$existing = Get-RunningProcess
if ($null -ne $existing) {
  throw "Workshop uploader is already running with PID $($existing.Id)."
}
Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $StopPath -Force -ErrorAction SilentlyContinue
New-Item -ItemType File -Path $LockPath -ErrorAction Stop | Out-Null

$RunId = Get-Date -Format "yyyyMMdd-HHmmss"
$RunRoot = Join-Path $WorkRoot $RunId
New-Item -ItemType Directory -Path $RunRoot -Force | Out-Null
$FrozenConfig = Join-Path $RunRoot "reviewed.jobs.json"
Copy-Item -LiteralPath $ConfigPath -Destination $FrozenConfig
$StdoutLog = Join-Path $RunRoot "upload.log"
$StderrLog = Join-Path $RunRoot "upload.error.log"
$NodePath = (Get-Command node).Source
$Publisher = Join-Path $ProjectRoot "scripts\publish-workshop-assets.js"

try {
  $process = Start-Process -FilePath $NodePath -ArgumentList @(
    $Publisher,
    "--config", $FrozenConfig,
    "--lock", $LockPath,
    "--stop", $StopPath
  ) -WorkingDirectory $ProjectRoot -RedirectStandardOutput $StdoutLog -RedirectStandardError $StderrLog -WindowStyle Hidden -PassThru
  @{
    pid = $process.Id
    runId = $RunId
    startedAt = (Get-Date).ToString("o")
    sourceConfig = $ConfigPath
    frozenConfig = $FrozenConfig
    stdoutLog = $StdoutLog
    stderrLog = $StderrLog
  } | ConvertTo-Json | Set-Content -LiteralPath $StatusPath -Encoding UTF8
  Write-Output ("Started workshop uploader PID " + $process.Id + ".")
  Write-Output ("Run npm run workshop-assets:runner -- status to monitor it.")
} catch {
  Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue
  throw
}
