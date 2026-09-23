[CmdletBinding()]
param(
  [string]$Config
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Config)) {
  $Config = Join-Path $PSScriptRoot '..\.tmp\minio-storage\config.json'
}

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this helper from an elevated PowerShell window.'
  }
}

function Invoke-WslRoot {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & wsl.exe -d $script:StorageConfig.distro -u root -- @Arguments 2>&1
    $wslExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($wslExitCode -ne 0) {
    throw ('WSL command failed: ' + ($output -join [Environment]::NewLine))
  }
  return ($output -join [Environment]::NewLine).Trim()
}

function Find-WslDeviceByUuid {
  param([Parameter(Mandatory = $true)][string]$Uuid)

  $output = & wsl.exe -d $script:StorageConfig.distro -u root -- blkid -U $Uuid 2>&1
  if ($LASTEXITCODE -eq 0) {
    return ($output -join [Environment]::NewLine).Trim()
  }
  if ($LASTEXITCODE -eq 2 -and ($output -join '').Length -eq 0) {
    return ''
  }
  throw ('WSL UUID probe failed: ' + ($output -join [Environment]::NewLine))
}

function Get-MinIOMount {
  & wsl.exe -d $script:StorageConfig.distro -u root -- mountpoint -q $script:StorageConfig.mountPoint
  if ($LASTEXITCODE -ne 0) {
    return $null
  }

  $details = Invoke-WslRoot -Arguments @(
    'findmnt',
    '-rn',
    '-o',
    'UUID,FSTYPE,SOURCE,TARGET',
    '--target',
    [string]$script:StorageConfig.mountPoint
  )
  $parts = $details -split '\s+', 4
  if ($parts.Count -ne 4) {
    throw ('Could not parse the MinIO mount details: ' + $details)
  }

  return [pscustomobject]@{
    Uuid = $parts[0]
    FilesystemType = $parts[1]
    Source = $parts[2]
    Target = $parts[3]
  }
}

function Get-RetainedXfsBridgeMount {
  $device = Find-WslDeviceByUuid -Uuid ([string]$script:StorageConfig.filesystemUuid)
  if ([string]::IsNullOrWhiteSpace($device)) {
    return $null
  }

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & wsl.exe -d $script:StorageConfig.distro -u root -- findmnt -rn -o UUID,FSTYPE,SOURCE,TARGET --source $device 2>&1
    $findMountExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($findMountExitCode -ne 0) {
    return $null
  }

  $expectedTargetPrefix = '/mnt/wsl/docker-desktop-bind-mounts/' + [string]$script:StorageConfig.distro + '/'
  foreach ($line in @($output)) {
    $parts = ([string]$line).Trim() -split '\s+', 4
    if (
      $parts.Count -eq 4 -and
      $parts[0] -eq [string]$script:StorageConfig.filesystemUuid -and
      $parts[1] -eq 'xfs' -and
      $parts[2] -eq [string]$device -and
      $parts[3].StartsWith($expectedTargetPrefix, [StringComparison]::Ordinal)
    ) {
      return [pscustomobject]@{
        Uuid = $parts[0]
        FilesystemType = $parts[1]
        Source = $parts[2]
        Target = $parts[3]
      }
    }
  }

  return $null
}

function Test-DockerReady {
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $version = & docker info --format '{{.ServerVersion}}' 2>$null
    $dockerExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  return $dockerExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace(($version -join ''))
}

function Test-DockerDesktopRunning {
  return $null -ne (Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Test-WslDockerReady {
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $version = & wsl.exe -d $script:StorageConfig.distro -- docker info --format '{{.ServerVersion}}' 2>$null
    $dockerExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  return $dockerExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace(($version -join ''))
}

function Wait-DockerReady {
  $deadline = (Get-Date).AddSeconds([int]$script:StorageConfig.dockerStartupTimeoutSeconds)
  do {
    if (Test-DockerReady) {
      return
    }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)

  throw ('Docker Desktop did not become ready within ' + $script:StorageConfig.dockerStartupTimeoutSeconds + ' seconds.')
}

function Wait-WslDockerReady {
  $deadline = (Get-Date).AddSeconds([int]$script:StorageConfig.dockerStartupTimeoutSeconds)
  do {
    if (Test-WslDockerReady) {
      return
    }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)

  throw ('Docker Desktop did not become ready inside ' + $script:StorageConfig.distro + ' within ' + $script:StorageConfig.dockerStartupTimeoutSeconds + ' seconds.')
}

function Test-WslKeepAlive {
  $marker = [string]$script:StorageConfig.wslKeepAliveLockPath
  $process = Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -ieq 'wsl.exe' -and
      -not [string]::IsNullOrWhiteSpace([string]$_.CommandLine) -and
      [string]$_.CommandLine -like ('*' + $marker + '*')
    } |
    Select-Object -First 1
  return $null -ne $process
}

function Ensure-WslKeepAlive {
  if (Test-WslKeepAlive) {
    return
  }

  Start-Process -FilePath 'wsl.exe' -ArgumentList @(
    '-d',
    [string]$script:StorageConfig.distro,
    '-u',
    'root',
    '--',
    '/usr/bin/flock',
    '-n',
    [string]$script:StorageConfig.wslKeepAliveLockPath,
    '/usr/bin/sleep',
    'infinity'
  ) -WindowStyle Hidden | Out-Null

  $deadline = (Get-Date).AddSeconds(10)
  do {
    Start-Sleep -Milliseconds 250
    if (Test-WslKeepAlive) {
      return
    }
  } while ((Get-Date) -lt $deadline)

  if (-not (Test-WslKeepAlive)) {
    throw ('Could not start the WSL mount keep-alive process for lock: ' + $script:StorageConfig.wslKeepAliveLockPath)
  }
}

function Get-MinIOContainer {
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & docker inspect $script:StorageConfig.container 2>&1
    $dockerExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($dockerExitCode -eq 0) {
    return @(($output -join [Environment]::NewLine | ConvertFrom-Json))[0]
  }
  if (($output -join [Environment]::NewLine) -match 'No such object') {
    return $null
  }
  throw ('Docker could not inspect the configured MinIO container: ' + ($output -join [Environment]::NewLine))
}

function Stop-MinIOIfRunning {
  if (-not (Test-DockerReady)) {
    return
  }

  try {
    $containerInfo = Get-MinIOContainer
    if ($null -ne $containerInfo -and [string]$containerInfo.State.Status -eq 'running') {
      & docker stop --timeout 30 $script:StorageConfig.container 2>$null | Out-Null
    }
  } catch {
    Write-Warning ('Could not verify that MinIO is stopped after a guard failure: ' + $_.Exception.Message)
  }
}

function Get-RequiredReserveBytes {
  param([UInt64]$TotalBytes)

  $filesystemReserve = [Math]::Max(
    [Math]::Ceiling([double]$TotalBytes * [double]$script:StorageConfig.reserveRatio),
    [double]$script:StorageConfig.minimumReserveBytes
  )
  return [UInt64]([double]$script:StorageConfig.pipelineReserveBytes + $filesystemReserve)
}

function Assert-DockerAutoStartDisabled {
  $settingsPath = (Resolve-Path -LiteralPath $script:StorageConfig.dockerSettingsPath).Path
  $settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
  $autoStartProperty = $settings.PSObject.Properties |
    Where-Object { $_.Name -ieq 'AutoStart' } |
    Select-Object -First 1
  if ($null -eq $autoStartProperty -or [bool]$autoStartProperty.Value) {
    throw 'Docker Desktop automatic startup must be disabled before using this helper.'
  }

  $runKey = Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
  $runProperty = $runKey.PSObject.Properties |
    Where-Object { $_.Name -eq [string]$script:StorageConfig.dockerAutoStartRunValue } |
    Select-Object -First 1
  if ($null -ne $runProperty -and -not [string]::IsNullOrWhiteSpace([string]$runProperty.Value)) {
    throw 'The Docker Desktop Windows Run entry is still enabled.'
  }
}

function Assert-ComposeMinIOPolicy {
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $composeOutput = & wsl.exe -d $script:StorageConfig.distro -- docker compose -f $script:StorageConfig.composeFile config --format json 2>&1
    $composeExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($composeExitCode -ne 0) {
    throw ('Docker Compose configuration failed: ' + ($composeOutput -join [Environment]::NewLine))
  }

  $compose = $composeOutput -join [Environment]::NewLine | ConvertFrom-Json
  $serviceProperty = $compose.services.PSObject.Properties |
    Where-Object { $_.Name -eq [string]$script:StorageConfig.composeService } |
    Select-Object -First 1
  if ($null -eq $serviceProperty) {
    throw ('Compose service not found: ' + $script:StorageConfig.composeService)
  }

  $service = $serviceProperty.Value
  if ([string]$service.restart -ne 'no') {
    throw 'The machine-local MinIO Compose service must use restart policy no.'
  }
  if ([string]$service.container_name -ne [string]$script:StorageConfig.container) {
    throw ('Unexpected MinIO Compose container name: ' + $service.container_name)
  }
}

function Recreate-StoppedMinIO {
  $containerInfo = Get-MinIOContainer
  if ($null -ne $containerInfo) {
    if ([string]$containerInfo.State.Status -eq 'running') {
      $containerFilesystem = (& docker exec $script:StorageConfig.container stat -f -c '%T' /data).Trim()
      if ($LASTEXITCODE -ne 0 -or $containerFilesystem -ne 'xfs') {
        & docker stop --timeout 30 $script:StorageConfig.container 2>$null | Out-Null
        throw ('MinIO was already running on an unverified filesystem and was stopped: ' + $containerFilesystem)
      }
      return $containerInfo
    }

    & docker rm $script:StorageConfig.container | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw 'Docker could not remove the stopped MinIO container definition.'
    }
  }

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $composeOutput = & wsl.exe -d $script:StorageConfig.distro -- docker compose -f $script:StorageConfig.composeFile up --no-deps --no-start $script:StorageConfig.composeService 2>&1
    $composeExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($composeExitCode -ne 0) {
    throw ('Docker could not recreate the stopped MinIO Compose service: ' + ($composeOutput -join [Environment]::NewLine))
  }

  $containerInfo = Get-MinIOContainer
  if ($null -eq $containerInfo -or [string]$containerInfo.State.Status -eq 'running') {
    throw 'MinIO recreation did not leave exactly one stopped container ready for guarded startup.'
  }
  return $containerInfo
}

function Assert-MinIOContainerConfiguration {
  param([Parameter(Mandatory = $true)]$ContainerInfo)

  if ([string]$ContainerInfo.Image -ne [string]$script:StorageConfig.expectedImageId) {
    throw ('MinIO image ID does not match the pinned image: ' + $ContainerInfo.Image)
  }
  if ([string]$ContainerInfo.HostConfig.RestartPolicy.Name -ne 'no') {
    throw 'MinIO must exist with automatic container restart disabled.'
  }

  $dataMount = @($ContainerInfo.Mounts) |
    Where-Object { $_.Destination -eq '/data' } |
    Select-Object -First 1
  if ($null -eq $dataMount -or [string]$dataMount.Source -ne [string]$script:StorageConfig.mountPoint) {
    throw ('MinIO /data bind source does not match the configured mountpoint: ' + $dataMount.Source)
  }

  $networkNames = @($ContainerInfo.NetworkSettings.Networks.PSObject.Properties.Name)
  if ($networkNames -notcontains [string]$script:StorageConfig.expectedNetwork) {
    throw ('MinIO is not attached to the expected network: ' + $script:StorageConfig.expectedNetwork)
  }

  foreach ($portProperty in $script:StorageConfig.expectedHostPorts.PSObject.Properties) {
    $bindingProperty = $ContainerInfo.HostConfig.PortBindings.PSObject.Properties |
      Where-Object { $_.Name -eq $portProperty.Name } |
      Select-Object -First 1
    $bindings = if ($null -eq $bindingProperty) { @() } else { @($bindingProperty.Value) }
    $hostPorts = @($bindings | ForEach-Object { [string]$_.HostPort })
    if ($hostPorts -notcontains [string]$portProperty.Value) {
      throw ('Missing expected MinIO port binding ' + $portProperty.Name + ' -> ' + $portProperty.Value)
    }
  }

  if ($null -eq $ContainerInfo.Config.Healthcheck) {
    throw 'MinIO must retain its configured container healthcheck.'
  }
}

function Get-MinIOContainerCapacity {
  $capacityOutput = & docker exec $script:StorageConfig.container df -B1 --output=size,avail /data 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw ('Could not read MinIO XFS capacity: ' + ($capacityOutput -join [Environment]::NewLine))
  }
  $capacity = ($capacityOutput -join [Environment]::NewLine) -split '\s+'
  return [pscustomobject]@{
    Total = [UInt64]$capacity[-2]
    Available = [UInt64]$capacity[-1]
  }
}

function Assert-RequiredBuckets {
  foreach ($bucket in @($script:StorageConfig.requiredBuckets)) {
    if ([string]$bucket -notmatch '^[a-z0-9][a-z0-9.-]*$') {
      throw ('Unsafe required bucket name in startup configuration: ' + $bucket)
    }
    $bucketPath = '/data/' + [string]$bucket
    & docker exec $script:StorageConfig.container test -d $bucketPath
    if ($LASTEXITCODE -ne 0) {
      throw ('Required MinIO bucket directory is missing: ' + $bucket)
    }
  }
}

function Assert-HttpEndpoint {
  param([Parameter(Mandatory = $true)]$Definition)

  $method = if ([string]::IsNullOrWhiteSpace([string]$Definition.method)) {
    'GET'
  } else {
    [string]$Definition.method
  }
  $response = Invoke-WebRequest -UseBasicParsing -Method $method -Uri ([string]$Definition.url) -TimeoutSec 30
  if ([int]$response.StatusCode -ne 200) {
    throw ($Definition.label + ' returned HTTP ' + $response.StatusCode)
  }

  $contentType = ([string]$response.Headers.'Content-Type' -split ';')[0]
  if ($contentType -ne [string]$Definition.contentType) {
    throw ($Definition.label + ' returned unexpected content type: ' + $contentType)
  }

  $contentLength = if ($method -ieq 'HEAD') {
    [UInt64]$response.Headers.'Content-Length'
  } else {
    [UInt64]$response.RawContentLength
  }
  if ($contentLength -ne [UInt64]$Definition.expectedBytes) {
    throw ($Definition.label + ' returned unexpected byte length: ' + $contentLength)
  }
}

Assert-Administrator

$ConfigPath = (Resolve-Path -LiteralPath $Config).Path
$script:StorageConfig = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json

$requiredScalarProperties = @(
  'vhdPath',
  'distro',
  'filesystemUuid',
  'mountPoint',
  'container',
  'expectedImageId',
  'hostVolumeRoot',
  'expectedVirtualSizeBytes',
  'pipelineReserveBytes',
  'reserveRatio',
  'minimumReserveBytes',
  'dockerDesktopExecutable',
  'dockerSettingsPath',
  'dockerAutoStartRunValue',
  'dockerStartupTimeoutSeconds',
  'wslKeepAliveLockPath',
  'composeFile',
  'composeService',
  'expectedNetwork',
  'healthUrl'
)
foreach ($property in $requiredScalarProperties) {
  if ($null -eq $script:StorageConfig.$property -or [string]::IsNullOrWhiteSpace([string]$script:StorageConfig.$property)) {
    throw ('Missing required storage config value: ' + $property)
  }
}
if (
  $null -eq $script:StorageConfig.expectedHostPorts -or
  @($script:StorageConfig.expectedHostPorts.PSObject.Properties).Count -eq 0
) {
  throw 'At least one expected MinIO host-port binding must be configured.'
}
if (@($script:StorageConfig.requiredBuckets).Count -eq 0) {
  throw 'At least one required bucket must be configured.'
}
if (@($script:StorageConfig.representativeAssets).Count -eq 0) {
  throw 'At least one representative asset must be configured.'
}

try {
  Assert-DockerAutoStartDisabled

  $vhdService = Get-Service -Name 'vmms'
  if ($vhdService.Status -ne 'Running') {
    Start-Service -Name 'vmms'
    $vhdService.WaitForStatus(
      [System.ServiceProcess.ServiceControllerStatus]::Running,
      [TimeSpan]::FromSeconds(15)
    )
  }

  $VhdPath = (Resolve-Path -LiteralPath $script:StorageConfig.vhdPath).Path
  $dockerDesktopPath = (Resolve-Path -LiteralPath $script:StorageConfig.dockerDesktopExecutable).Path
  $vhd = Get-VHD -Path $VhdPath
  if ($vhd.VhdType -ne 'Dynamic') {
    throw ('Expected a dynamic VHDX; found ' + $vhd.VhdType + '.')
  }
  if ([UInt64]$vhd.Size -ne [UInt64]$script:StorageConfig.expectedVirtualSizeBytes) {
    throw ('Unexpected VHDX virtual size: ' + $vhd.Size + '.')
  }

  $driveLetter = ([IO.Path]::GetPathRoot([string]$script:StorageConfig.hostVolumeRoot)).TrimEnd('\').TrimEnd(':')
  $hostVolume = Get-Volume -DriveLetter $driveLetter
  $requiredHostReserve = Get-RequiredReserveBytes -TotalBytes ([UInt64]$hostVolume.Size)
  if ([UInt64]$hostVolume.SizeRemaining -lt $requiredHostReserve) {
    throw ('Host capacity is below the protected reserve. Available=' + $hostVolume.SizeRemaining + ' Required=' + $requiredHostReserve)
  }

  $dockerReady = Test-DockerReady
  $dockerDesktopRunning = Test-DockerDesktopRunning
  $mountInfo = Get-MinIOMount
  $mountIsExpected = (
    $null -ne $mountInfo -and
    [string]$mountInfo.Uuid -eq [string]$script:StorageConfig.filesystemUuid -and
    [string]$mountInfo.FilesystemType -eq 'xfs'
  )

  $retainedXfsBridge = $null
  $runningXfsContainerInfo = $null
  if ($dockerReady) {
    $existingContainerInfo = Get-MinIOContainer
    if ($null -ne $existingContainerInfo -and [string]$existingContainerInfo.State.Status -eq 'running') {
      $containerFilesystem = (& docker exec $script:StorageConfig.container stat -f -c '%T' /data).Trim()
      if ($LASTEXITCODE -eq 0 -and $containerFilesystem -eq 'xfs') {
        $retainedXfsBridge = Get-RetainedXfsBridgeMount
        if ($null -ne $retainedXfsBridge) {
          $runningXfsContainerInfo = $existingContainerInfo
        }
      }
    }
  }

  if ($null -ne $runningXfsContainerInfo -and -not $mountIsExpected) {
    Assert-ComposeMinIOPolicy
    Assert-MinIOContainerConfiguration -ContainerInfo $runningXfsContainerInfo

    $containerCapacity = Get-MinIOContainerCapacity
    $xfsTotal = [UInt64]$containerCapacity.Total
    $xfsAvailable = [UInt64]$containerCapacity.Available
    $xfsReserve = [UInt64][Math]::Max(
      [Math]::Ceiling([double]$xfsTotal * [double]$script:StorageConfig.reserveRatio),
      [double]$script:StorageConfig.minimumReserveBytes
    )
    if ($xfsAvailable -lt $xfsReserve) {
      throw ('XFS capacity is below its protected reserve. Available=' + $xfsAvailable + ' Required=' + $xfsReserve)
    }

    if ([string]$runningXfsContainerInfo.State.Health.Status -ne 'healthy') {
      throw ('MinIO is not healthy; current health is ' + $runningXfsContainerInfo.State.Health.Status + '.')
    }
    Assert-RequiredBuckets

    $healthResponse = Invoke-WebRequest -UseBasicParsing -Uri ([string]$script:StorageConfig.healthUrl) -TimeoutSec 15
    if ([int]$healthResponse.StatusCode -ne 200) {
      throw ('MinIO health endpoint returned HTTP ' + $healthResponse.StatusCode)
    }
    foreach ($asset in @($script:StorageConfig.representativeAssets)) {
      Assert-HttpEndpoint -Definition $asset
    }

    Write-Output ('MinIO is already running safely on retained XFS UUID ' + $retainedXfsBridge.Uuid + '.')
    Write-Output ('Host available bytes: ' + $hostVolume.SizeRemaining + '; protected reserve: ' + $requiredHostReserve + '.')
    Write-Output ('XFS available bytes: ' + $xfsAvailable + '; protected reserve: ' + $xfsReserve + '.')
    Write-Output ('Verified buckets: ' + (@($script:StorageConfig.requiredBuckets) -join ', ') + '.')
    Write-Output ('Verified representative assets: ' + (@($script:StorageConfig.representativeAssets).Count) + '.')
    return
  }

  if (($dockerReady -or $dockerDesktopRunning) -and -not $mountIsExpected) {
    Stop-MinIOIfRunning
    throw 'Docker Desktop started before the expected XFS mount. Stop Docker Desktop completely, then rerun this helper. No Docker workload was stopped automatically except an unsafe running MinIO container.'
  }

  Ensure-WslKeepAlive

  $device = Find-WslDeviceByUuid -Uuid ([string]$script:StorageConfig.filesystemUuid)
  if ([string]::IsNullOrWhiteSpace($device)) {
    & wsl.exe --mount --vhd $VhdPath --bare
    if ($LASTEXITCODE -ne 0) {
      throw 'Could not attach the configured MinIO VHDX.'
    }
    $device = Find-WslDeviceByUuid -Uuid ([string]$script:StorageConfig.filesystemUuid)
  }
  if ([string]::IsNullOrWhiteSpace($device)) {
    throw 'The expected filesystem UUID was not found after attaching the VHDX.'
  }

  $filesystemType = Invoke-WslRoot -Arguments @('blkid', '-s', 'TYPE', '-o', 'value', [string]$device)
  if ($filesystemType -ne 'xfs') {
    throw ('Expected XFS for ' + $device + '; found ' + $filesystemType + '.')
  }

  if ($null -ne $mountInfo -and -not $mountIsExpected) {
    throw ('A different filesystem is mounted at ' + $script:StorageConfig.mountPoint + '.')
  }
  Invoke-WslRoot -Arguments @('mkdir', '-p', [string]$script:StorageConfig.mountPoint) | Out-Null
  if (-not $mountIsExpected) {
    Invoke-WslRoot -Arguments @(
      'mount',
      '-t',
      'xfs',
      ('UUID=' + $script:StorageConfig.filesystemUuid),
      [string]$script:StorageConfig.mountPoint
    ) | Out-Null
  }

  $mountInfo = Get-MinIOMount
  if (
    $null -eq $mountInfo -or
    [string]$mountInfo.Uuid -ne [string]$script:StorageConfig.filesystemUuid -or
    [string]$mountInfo.FilesystemType -ne 'xfs'
  ) {
    throw ('Wrong filesystem mounted at ' + $script:StorageConfig.mountPoint + '.')
  }

  $capacity = (Invoke-WslRoot -Arguments @(
    'df',
    '-B1',
    '--output=size,avail',
    [string]$script:StorageConfig.mountPoint
  )) -split '\s+'
  $xfsTotal = [UInt64]$capacity[-2]
  $xfsAvailable = [UInt64]$capacity[-1]
  $xfsReserve = [UInt64][Math]::Max(
    [Math]::Ceiling([double]$xfsTotal * [double]$script:StorageConfig.reserveRatio),
    [double]$script:StorageConfig.minimumReserveBytes
  )
  if ($xfsAvailable -lt $xfsReserve) {
    throw ('XFS capacity is below its protected reserve. Available=' + $xfsAvailable + ' Required=' + $xfsReserve)
  }

  if (-not $dockerReady) {
    if (-not $dockerDesktopRunning) {
      Start-Process -FilePath $dockerDesktopPath -WindowStyle Hidden
    }
    Wait-DockerReady
  }

  Wait-WslDockerReady
  $mountInfo = Get-MinIOMount
  if (
    $null -eq $mountInfo -or
    [string]$mountInfo.Uuid -ne [string]$script:StorageConfig.filesystemUuid -or
    [string]$mountInfo.FilesystemType -ne 'xfs'
  ) {
    throw 'The expected XFS mount disappeared while Docker Desktop was starting. MinIO will remain stopped.'
  }

  Assert-ComposeMinIOPolicy
  $containerInfo = Recreate-StoppedMinIO
  Assert-MinIOContainerConfiguration -ContainerInfo $containerInfo

  if ([string]$containerInfo.State.Status -ne 'running') {
    & docker start $script:StorageConfig.container | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw 'Docker could not start the MinIO container.'
    }
  }

  $deadline = (Get-Date).AddSeconds(90)
  do {
    Start-Sleep -Seconds 2
    $containerInfo = Get-MinIOContainer
    $health = if ($null -eq $containerInfo.State.Health) {
      'none'
    } else {
      [string]$containerInfo.State.Health.Status
    }
  } while ($health -eq 'starting' -and (Get-Date) -lt $deadline)
  if ($health -ne 'healthy') {
    throw ('MinIO did not become healthy; current health is ' + $health + '.')
  }

  $containerFilesystem = (& docker exec $script:StorageConfig.container stat -f -c '%T' /data).Trim()
  if ($LASTEXITCODE -ne 0 -or $containerFilesystem -ne 'xfs') {
    throw ('MinIO /data is not the expected XFS filesystem: ' + $containerFilesystem)
  }

  Assert-RequiredBuckets

  $healthResponse = Invoke-WebRequest -UseBasicParsing -Uri ([string]$script:StorageConfig.healthUrl) -TimeoutSec 15
  if ([int]$healthResponse.StatusCode -ne 200) {
    throw ('MinIO health endpoint returned HTTP ' + $healthResponse.StatusCode)
  }

  foreach ($asset in @($script:StorageConfig.representativeAssets)) {
    Assert-HttpEndpoint -Definition $asset
  }
} catch {
  Stop-MinIOIfRunning
  throw
}

Write-Output ('MinIO started safely after XFS mount on UUID ' + $script:StorageConfig.filesystemUuid + '.')
Write-Output ('Host available bytes: ' + $hostVolume.SizeRemaining + '; protected reserve: ' + $requiredHostReserve + '.')
Write-Output ('XFS available bytes: ' + $xfsAvailable + '; protected reserve: ' + $xfsReserve + '.')
Write-Output ('Verified buckets: ' + (@($script:StorageConfig.requiredBuckets) -join ', ') + '.')
Write-Output ('Verified representative assets: ' + (@($script:StorageConfig.representativeAssets).Count) + '.')
