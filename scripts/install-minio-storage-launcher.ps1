[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$Config,
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'ASIMOV-HAWKS\MinIOStorage'),
  [string]$ShortcutPath = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Start ASIMOV Storage.lnk')
)

$ErrorActionPreference = 'Stop'

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this one-time installer from an elevated PowerShell window.'
  }
}

if (-not $WhatIfPreference) {
  Assert-Administrator
}

if ([string]::IsNullOrWhiteSpace($Config)) {
  $Config = Join-Path $PSScriptRoot '..\.tmp\minio-storage\config.json'
}

$configPath = (Resolve-Path -LiteralPath $Config).Path
$storageConfig = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$credentialLikeProperties = $storageConfig.PSObject.Properties |
  Where-Object { $_.Name -match '(?i)(secret|password|credential|access.?key)' }
if (@($credentialLikeProperties).Count -gt 0) {
  throw 'The MinIO startup configuration must not contain credentials or access keys.'
}
$settingsPath = (Resolve-Path -LiteralPath $storageConfig.dockerSettingsPath).Path
$settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
$autoStartProperty = $settings.PSObject.Properties |
  Where-Object { $_.Name -ieq 'AutoStart' } |
  Select-Object -First 1
if ($null -eq $autoStartProperty) {
  throw ('Docker Desktop AutoStart setting is missing from ' + $settingsPath + '.')
}

$runKeyPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runKey = Get-ItemProperty -LiteralPath $runKeyPath
$runProperty = $runKey.PSObject.Properties |
  Where-Object { $_.Name -eq [string]$storageConfig.dockerAutoStartRunValue } |
  Select-Object -First 1
$startupDrift = [bool]$autoStartProperty.Value -or (
  $null -ne $runProperty -and
  -not [string]::IsNullOrWhiteSpace([string]$runProperty.Value)
)

if ($startupDrift) {
  $dockerDesktopRunning = $null -ne (
    Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue |
      Select-Object -First 1
  )
  if ($dockerDesktopRunning) {
    throw 'Quit Docker Desktop completely before this installer disables automatic startup.'
  }
}

$sourceFiles = @(
  'minio-storage-start.ps1',
  'minio-storage-status.ps1',
  'minio-storage-launcher.ps1'
)
foreach ($sourceFile in $sourceFiles) {
  $sourcePath = Join-Path $PSScriptRoot $sourceFile
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw ('Required launcher source is missing: ' + $sourcePath)
  }
}

if ($PSCmdlet.ShouldProcess($InstallRoot, 'Create the stable ASIMOV storage runtime directory')) {
  New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
}

if ([bool]$autoStartProperty.Value) {
  $backupPath = Join-Path $InstallRoot ('settings-store.autostart-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.json')
  if ($PSCmdlet.ShouldProcess($settingsPath, 'Back up Docker settings and disable Docker Desktop AutoStart')) {
    Copy-Item -LiteralPath $settingsPath -Destination $backupPath -Force
    $autoStartProperty.Value = $false
    $settingsJson = $settings | ConvertTo-Json -Depth 100
    [IO.File]::WriteAllText($settingsPath, $settingsJson, [Text.UTF8Encoding]::new($false))
  }
}

if (
  $null -ne $runProperty -and
  -not [string]::IsNullOrWhiteSpace([string]$runProperty.Value) -and
  $PSCmdlet.ShouldProcess($runKeyPath, 'Remove the Docker Desktop automatic startup entry')
) {
  Remove-ItemProperty -LiteralPath $runKeyPath -Name ([string]$storageConfig.dockerAutoStartRunValue)
}

foreach ($sourceFile in $sourceFiles) {
  $sourcePath = Join-Path $PSScriptRoot $sourceFile
  $destinationPath = Join-Path $InstallRoot $sourceFile
  if ($PSCmdlet.ShouldProcess($destinationPath, 'Install the ASIMOV storage runtime file')) {
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
  }
}

$installedConfigPath = Join-Path $InstallRoot 'config.json'
if ($PSCmdlet.ShouldProcess($installedConfigPath, 'Install the machine-local MinIO configuration')) {
  Copy-Item -LiteralPath $configPath -Destination $installedConfigPath -Force
}

$installedLauncherPath = Join-Path $InstallRoot 'minio-storage-launcher.ps1'
if ($PSCmdlet.ShouldProcess($ShortcutPath, 'Create the Start ASIMOV Storage desktop shortcut')) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
  $shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $installedLauncherPath + '"'
  $shortcut.WorkingDirectory = $InstallRoot
  $shortcut.Description = 'Safely attach XFS storage, start Docker Desktop, and start MinIO.'
  if (Test-Path -LiteralPath $storageConfig.dockerDesktopExecutable) {
    $shortcut.IconLocation = ([string]$storageConfig.dockerDesktopExecutable + ',0')
  }
  $shortcut.Save()
}

if ($WhatIfPreference) {
  Write-Output ('Planned ASIMOV storage runtime: ' + $InstallRoot)
  Write-Output ('Planned desktop shortcut: ' + $ShortcutPath)
} else {
  Write-Output ('Installed ASIMOV storage runtime: ' + $InstallRoot)
  Write-Output ('Desktop shortcut: ' + $ShortcutPath)
  Write-Output 'Docker Desktop automatic startup remains disabled; use the shortcut when storage is needed.'
}
