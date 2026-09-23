# MinIO storage relocation runbook

This runbook moves the existing MinIO backend to a dedicated dynamic XFS VHDX
on the Windows host drive without changing object keys, application routes,
credentials, ports, or the container data path. It is a maintenance workflow,
not an automatic application migration.

## Fixed contract

- VHDX: `D:\MinIO\minio-data.vhdx`
- VHDX type: dynamic
- Maximum virtual size: `1,000,000,000,000` bytes
- Linux filesystem: XFS
- WSL distribution: `Ubuntu-22.04`
- Linux mountpoint: `/home/deine/asimov-hawks-storage/minio-data`
- Container path: `/data`
- MinIO image digest: preserve the digest recorded immediately before downtime
- Host pipeline reserve: `500,000,000,000` bytes
- Additional reserve: larger of 5% of the relevant filesystem or 20 GiB
- Transfer allowance: remaining bytes plus 10% overhead

The Windows `D:` volume stays NTFS. Only the filesystem inside the new VHDX
is formatted as XFS. Never format, repartition, or mount the physical host disk
through WSL.

## Private evidence and configuration

Store machine inventory, compose backups, object inventories, checksums, copy
logs, and the populated startup configuration under ignored local storage, not
in Git. Copy `scripts/minio-storage.config.example.json` to
`.tmp/minio-storage/config.json`, replace the XFS UUID after format, and record
the exact pre-migration container image ID. Do not put credentials in that
file.

## Preflight

1. Confirm the workshop uploader reports stopped.
2. Stop the visualization geospatial processing pipeline and confirm no
   pipeline worker remains.
3. Prevent all MinIO writes for the maintenance window.
4. Record:
   - `docker inspect hawks-minio`
   - the resolved MinIO image digest
   - the `/data` bind source and restart policy
   - MinIO health
   - bucket, object-count, object-byte, and metadata inventories
   - Wave 1 and Wave 2 verification reports
   - source directory file count, allocated/logical bytes, ownership, modes,
     timestamps, extended attributes, hard links, and a sorted SHA-256 list
5. Recalculate `D:` total/free bytes. Require enough space for the remaining
   transfer plus 10% overhead while retaining 500 GB plus the larger of 5% or
   20 GiB.
6. Confirm `D:`, `E:`, and `F:` are treated as one physical failure
   boundary.

Any failed or unreadable preflight check stops the migration.

## Create and identify the VHDX

Run the Windows storage commands from an elevated PowerShell window:

```powershell
New-Item -ItemType Directory -Path 'D:\MinIO' -Force
New-VHD -Path 'D:\MinIO\minio-data.vhdx' -Dynamic -SizeBytes 1000000000000
Get-VHD -Path 'D:\MinIO\minio-data.vhdx' | Format-List Path,VhdType,Size,FileSize
wsl --mount --vhd 'D:\MinIO\minio-data.vhdx' --bare
```

Before formatting, identify the newly attached empty disk from its exact VHDX
attachment and size. Abort if more than one candidate exists or if any
candidate already has a filesystem or data. Install XFS tools and format only
that verified virtual device:

```powershell
wsl -d Ubuntu-22.04 -u root -- apt-get update
wsl -d Ubuntu-22.04 -u root -- apt-get install -y xfsprogs rsync
wsl -d Ubuntu-22.04 -u root -- lsblk -b -o NAME,SIZE,TYPE,FSTYPE,UUID,MOUNTPOINTS
wsl -d Ubuntu-22.04 -u root -- mkfs.xfs -f /dev/VERIFIED_NEW_VHD_DEVICE
wsl -d Ubuntu-22.04 -u root -- blkid /dev/VERIFIED_NEW_VHD_DEVICE
```

Record the UUID in the ignored startup configuration. Mount it first at a
temporary path and verify XFS, UUID, capacity, owner, and mode.

## Stopped copy

1. Disable automatic restart without recreating or upgrading the service:
   `docker update --restart=no hawks-minio`.
2. Stop only `hawks-minio` and confirm it is stopped.
3. Confirm the source remains the original ext4-backed directory.
4. Mount the new XFS filesystem at a temporary mountpoint.
5. Copy the complete source, including `.minio.sys`, with stopped-source
   consistency:

```bash
rsync -aHAXS --numeric-ids --info=progress2 SOURCE/ TEMP_XFS_MOUNT/
```

6. Compare sorted relative paths, file/symlink/directory counts, logical and
   allocated bytes, ownership, modes, timestamps, extended attributes, hard
   links, and sorted SHA-256 file-content inventories.

Do not cut over if any comparison fails. Restart the original container on the
original data directory if the maintenance window must be abandoned.

## Cutover

1. Rename the stopped original directory to a dated rollback name on `C:`.
2. Create the original mountpoint as an empty directory.
3. Unmount the temporary XFS mount and mount its UUID at the original path.
4. Verify `mountpoint`, UUID, XFS, capacity, owner, mode, and copied content.
5. Confirm the existing container bind source is still the original Linux path.
6. Keep the container restart policy set to `no`.
7. Start MinIO only through:

```powershell
npm run minio-storage:start
```

The helper requires elevation, the exact dynamic VHDX size, expected UUID,
XFS, correct mountpoint, physical host reserve, XFS reserve, the pinned image
ID, disabled automatic restart, the expected bind path, and healthy MinIO. It
fails closed before starting the container when any prerequisite is absent and
stops MinIO if a post-start health or filesystem assertion fails.

## Restart recovery

After Windows, WSL, or Docker restarts, do not use the MinIO console or asset
routes until the guarded helper passes. Docker Desktop automatic sign-in start
must remain disabled, its Windows Run entry must remain absent, and MinIO must
retain restart policy `no`. Run one elevated command from the repository root:

```powershell
npm run minio-storage:start
```

The helper starts the manual Hyper-V VHD management service when needed,
treats an absent UUID as a detached-disk condition, attaches the exact
configured VHDX, mounts XFS, starts Docker Desktop hidden, waits for both the
Windows and Ubuntu Docker clients, and recreates only the stopped MinIO service
after the exact mount is present. It validates image, restart policy, bind,
network, ports, healthcheck, both capacity reserves, five buckets, health, and
representative tile and point-cloud objects. It never starts WebODM, a pipeline
run, or an asset upload.

Docker Desktop retains the XFS mount through an internal bridge under
`/mnt/wsl/docker-desktop-bind-mounts/Ubuntu-22.04/`. A later independent Ubuntu
shell may show the ordinary ext4 filesystem at the original source path even
while the running container still has the correct XFS bridge. On an idempotent
helper run, safety therefore requires all three facts: the configured UUID is
mounted as XFS at that Docker bridge, the container bind source remains the
configured data path, and `/data` reports XFS. A running container that cannot
prove all three is stopped fail-closed.

If the console shows no buckets or the helper reports `ext2/ext3`, stop there.
This indicates Docker Desktop retained a bridge to the ordinary Ubuntu ext4
directory beneath the XFS mount. Keep MinIO stopped, confirm the configured
XFS UUID is mounted at the source path, remove only the stopped MinIO container
definition and its exact unused Docker Desktop bridge, then recreate only the
`minio` Compose service with `--no-deps --no-start`. Restore restart policy
`no` and run the guarded helper again. Verify configuration parity before
startup; never delete the ordinary directory, rollback copy, or VHDX during
this recovery.

## Coordinated restart acceptance

Run this only after the active `AH-026095` pipeline run and WebODM processing
have finished and uploads are stopped. Record baseline MinIO health, the XFS
UUID, all five buckets, host/XFS capacity, and representative tile and
point-cloud access. Gracefully stop the pipeline and WebODM, stop `hawks-minio`,
and confirm both the live container and machine-local Compose service use
restart policy `no`.

Obtain explicit approval immediately before restarting Windows. Restart
Windows, WSL, and Docker within the approved maintenance window. Before opening
the MinIO console or any survey route, confirm MinIO did not start
automatically. Then run the elevated guarded startup helper and verify the
expected UUID and XFS at `/data`, five buckets, HTTP 200 health, representative
tile and point-cloud objects, Survey and Orthomap rendering, permitted normal
and User App Preview access, denied anonymous/cross-scope access, and clean
browser console/network activity.

If the stale ext4 bridge returns, the acceptance test fails. Keep MinIO
stopped, use the stale-bridge recovery procedure above, keep Wave 3 blocked,
and correct the startup orchestration before repeating the test. Record the
final result in the relocation sign-off and compressed project state.

## Acceptance and rollback

Verify existing bucket/object/metadata inventories, Waves 1 and 2 reports,
protected tile delivery, point clouds, Orthomap, survey viewers, permitted
access, denied anonymous/cross-scope access, console/network health, and a
MinIO stop/start cycle. Record representative tile and point-cloud timings
against the pre-move baseline.

Test the fail-closed path while MinIO is stopped by leaving the expected VHDX
detached or configuring a deliberately wrong UUID; the helper must refuse to
start. Restore the real ignored configuration before normal startup.

Before any new upload, rollback is:

1. Stop MinIO.
2. Unmount XFS.
3. restore the original directory name and bind source.
4. Start the original instance and reverify health and objects.

After any new upload, the old copy is only a historical snapshot. Reconcile
all later writes before considering rollback. Keep both copies until a
separate retention and backup decision is approved.

## Wave 3 handoff

The old frozen Wave 3 config is stale and must not be resumed. Preserve it,
its checksum, and its zero-byte state as historical evidence. After storage
acceptance, regenerate the same three-survey scope under the current MinIO and
host-capacity policies, review and freeze it, record its new checksum, and
obtain separate upload approval. Run only one uploader while the pipeline is
paused. Never activate a partial workshop manifest.
