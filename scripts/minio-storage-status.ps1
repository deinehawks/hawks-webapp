[CmdletBinding()]
param(
  [string]$Config,
  [switch]$Json,
  [switch]$RequireReady
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Config)) {
  $installedConfig = Join-Path $PSScriptRoot 'config.json'
  if (Test-Path -LiteralPath $installedConfig) {
    $Config = $installedConfig
  } else {
    $Config = Join-Path $PSScriptRoot '..\.tmp\minio-storage\config.json'
  }
}

$configPath = (Resolve-Path -LiteralPath $Config).Path
$storageConfig = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json

$settingsPath = (Resolve-Path -LiteralPath $storageConfig.dockerSettingsPath).Path
$settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
$autoStartProperty = $settings.PSObject.Properties |
  Where-Object { $_.Name -ieq 'AutoStart' } |
  Select-Object -First 1
$dockerAutoStartDisabled = $null -ne $autoStartProperty -and -not [bool]$autoStartProperty.Value

$runKey = Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runProperty = $runKey.PSObject.Properties |
  Where-Object { $_.Name -eq [string]$storageConfig.dockerAutoStartRunValue } |
  Select-Object -First 1
$windowsRunEntryDisabled = $null -eq $runProperty -or [string]::IsNullOrWhiteSpace([string]$runProperty.Value)

$vhdPresent = Test-Path -LiteralPath $storageConfig.vhdPath
$dockerDesktopRunning = $null -ne (
  Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue |
    Select-Object -First 1
)

$dockerVersion = & docker info --format '{{.ServerVersion}}' 2>$null
$dockerReady = $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($dockerVersion -join ''))

$uuidDevice = & wsl.exe -d $storageConfig.distro -u root -- blkid -U $storageConfig.filesystemUuid 2>$null
$uuidAttached = $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($uuidDevice -join ''))

$sourceMount = $null
if ($uuidAttached) {
  $mountOutput = & wsl.exe -d $storageConfig.distro -u root -- findmnt -rn -o UUID,FSTYPE,SOURCE,TARGET --source (($uuidDevice -join '').Trim()) 2>$null
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($mountOutput -join ''))) {
    $sourceMount = ($mountOutput -join [Environment]::NewLine).Trim()
  }
}

$containerStatus = 'unavailable'
$containerHealth = 'unavailable'
$containerDataFilesystem = 'unavailable'
if ($dockerReady) {
  $inspectOutput = & docker inspect $storageConfig.container 2>$null
  if ($LASTEXITCODE -eq 0) {
    $container = @(($inspectOutput -join [Environment]::NewLine | ConvertFrom-Json))[0]
    $containerStatus = [string]$container.State.Status
    if ($null -ne $container.State.Health) {
      $containerHealth = [string]$container.State.Health.Status
    } else {
      $containerHealth = 'none'
    }
    if ($containerStatus -eq 'running') {
      $filesystemOutput = & docker exec $storageConfig.container stat -f -c '%T' /data 2>$null
      if ($LASTEXITCODE -eq 0) {
        $containerDataFilesystem = ($filesystemOutput -join '').Trim()
      }
    }
  } else {
    $containerStatus = 'missing'
    $containerHealth = 'missing'
    $containerDataFilesystem = 'missing'
  }
}

$healthStatus = 'unavailable'
if ($containerStatus -eq 'running') {
  try {
    $healthResponse = Invoke-WebRequest -UseBasicParsing -Uri ([string]$storageConfig.healthUrl) -TimeoutSec 5
    $healthStatus = [string]$healthResponse.StatusCode
  } catch {
    $healthStatus = 'failed'
  }
}

$ready = (
  $dockerAutoStartDisabled -and
  $windowsRunEntryDisabled -and
  $vhdPresent -and
  $uuidAttached -and
  $dockerReady -and
  $containerStatus -eq 'running' -and
  $containerHealth -eq 'healthy' -and
  $containerDataFilesystem -eq 'xfs' -and
  $healthStatus -eq '200'
)

$result = [ordered]@{
  overall = if ($ready) { 'READY' } else { 'NOT READY' }
  configPath = $configPath
  dockerAutoStartDisabled = $dockerAutoStartDisabled
  windowsRunEntryDisabled = $windowsRunEntryDisabled
  vhdPresent = $vhdPresent
  uuidAttached = $uuidAttached
  uuidMounts = $sourceMount
  dockerDesktopRunning = $dockerDesktopRunning
  dockerEngineReady = $dockerReady
  containerStatus = $containerStatus
  containerHealth = $containerHealth
  containerDataFilesystem = $containerDataFilesystem
  healthHttpStatus = $healthStatus
}

if ($Json) {
  $result | ConvertTo-Json -Depth 4
} else {
  Write-Output ('ASIMOV storage: ' + $result.overall)
  Write-Output ('  Docker auto-start disabled: ' + $result.dockerAutoStartDisabled)
  Write-Output ('  Windows Run entry disabled: ' + $result.windowsRunEntryDisabled)
  Write-Output ('  VHDX present: ' + $result.vhdPresent)
  Write-Output ('  Expected XFS UUID attached: ' + $result.uuidAttached)
  Write-Output ('  Docker Desktop running: ' + $result.dockerDesktopRunning)
  Write-Output ('  Docker engine ready: ' + $result.dockerEngineReady)
  Write-Output ('  MinIO: ' + $result.containerStatus + ' / ' + $result.containerHealth)
  Write-Output ('  MinIO /data filesystem: ' + $result.containerDataFilesystem)
  Write-Output ('  MinIO health HTTP: ' + $result.healthHttpStatus)
  if (-not $ready) {
    Write-Output 'Run the Start ASIMOV Storage desktop shortcut or npm run minio-storage:start from elevated PowerShell.'
  }
}

if ($RequireReady -and -not $ready) {
  exit 2
}
