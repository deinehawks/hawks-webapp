[CmdletBinding()]
param(
  [switch]$NoPause
)

$ErrorActionPreference = 'Stop'

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
  $arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $PSCommandPath + '"'
  if ($NoPause) {
    $arguments += ' -NoPause'
  }
  try {
    $elevated = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -Verb RunAs -Wait -PassThru
    exit $elevated.ExitCode
  } catch {
    Write-Error ('Could not start the guarded storage helper with administrator rights: ' + $_.Exception.Message)
    exit 1
  }
}

$helperPath = Join-Path $PSScriptRoot 'minio-storage-start.ps1'
$configPath = Join-Path $PSScriptRoot 'config.json'
$logDirectory = Join-Path $PSScriptRoot 'logs'

if (-not (Test-Path -LiteralPath $helperPath)) {
  throw ('Installed MinIO helper is missing: ' + $helperPath)
}
if (-not (Test-Path -LiteralPath $configPath)) {
  throw ('Installed MinIO configuration is missing: ' + $configPath)
}

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$logPath = Join-Path $logDirectory ('startup-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
$exitCode = 0
$transcriptStarted = $false

try {
  Start-Transcript -Path $logPath -Force | Out-Null
  $transcriptStarted = $true
  Write-Output ('Starting guarded ASIMOV storage at ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '.')
  & $helperPath -Config $configPath
  Write-Host ''
  Write-Host 'ASIMOV storage is ready.' -ForegroundColor Green
} catch {
  $exitCode = 1
  Write-Host ''
  Write-Host 'ASIMOV storage did not start.' -ForegroundColor Red
  Write-Error $_
} finally {
  if ($transcriptStarted) {
    Stop-Transcript | Out-Null
  }
  Write-Host ('Log: ' + $logPath)
  if (-not $NoPause) {
    Read-Host 'Press Enter to close'
  }
}

exit $exitCode
