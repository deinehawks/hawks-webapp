# MinIO Storage Relocation Sign-Off

Date: 2026-09-22

Environment: local workshop staging infrastructure

Status: storage cutover and repeat restart accepted; external security gates pending

## Completed cutover

- Created `D:\MinIO\minio-data.vhdx` as a dynamic VHDX with an exact virtual
  size of 1,000,000,000,000 bytes. The Windows `D:` NTFS volume was not
  formatted or repartitioned.
- Formatted only the identified new virtual device as XFS. Its filesystem UUID
  is retained in ignored machine-local configuration.
- Disabled automatic restart for `hawks-minio`, stopped the service, and copied
  the complete backend including `.minio.sys` with `rsync -aHAXS
  --numeric-ids`.
- Source and destination each contained 1,235,773 files and 1,241,949
  directories. A metadata-aware no-write rsync comparison emitted no changes.
- The deterministic SHA-256 content-tree digest matched on both filesystems:
  `4d48ba4c69cacc5ddab3c5840b2c1b1f57b2fe950cc38994ebb177aebf0ca50b`.
- Mounted the XFS filesystem at the existing Linux data path and preserved the
  original ext4 data at
  `/home/deine/asimov-hawks-storage/minio-data.rollback-20260922`.
- Recreated only the MinIO Compose container because Docker retained the old
  bind-mount inode after cutover. The image ID remained
  `sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e`.
  Credentials, ports, network, service identity, and `/data` path were
  preserved. Automatic restart remains disabled.

## Verification evidence

- The guarded startup helper confirms the dynamic VHDX size, pinned image ID,
  UUID, XFS, mountpoint, bind source, restart policy, host/XFS reserves, health,
  and the filesystem visible inside `/data`.
- Final available capacity was approximately 1,629,000,114,176 bytes on `D:`
  against a 592,665,072,640-byte protected host reserve, and approximately
  928,152,948,736 bytes on XFS against a 49,975,585,997-byte reserve.
- MinIO and NGINX health returned HTTP 200 after cutover. Representative health
  timings remained within milliseconds of the pre-move local baseline.
- After starting the local Next auth upstream, anonymous tile, point-cloud, and
  malformed protected requests through NGINX all returned HTTP 401. The earlier
  HTTP 500 responses occurred only while no process was listening on port 3000.
- Wave 1 evidence remains 37,868 objects / 6,705,469,416 bytes with verification
  SHA-256
  `d6da7c24e9bce99e14f9cd5cd8ea499c92eb3d49fd997d6847d9f6e1007c3e8b`.
- Wave 2 evidence remains 383,975 objects / 24,142,306,973 bytes with
  verification SHA-256
  `23bc7bcc0b4239a545e057f3a79c424b72c3be61c9ae3dfaea6ff84da3a54785`.
- Fourteen authenticated first/last object samples across every Wave 1-2 group
  matched their frozen sizes, including all recorded point-cloud groups.
- A real MinIO stop/start cycle passed through the guarded helper. An
  intentionally absent configured VHDX caused exit 1 and left MinIO stopped;
  the real configuration then restored service successfully.
- Workshop asset regression passes 21/21. Targeted ESLint, TypeScript,
  PowerShell parsing, JSON parsing, and `git diff --check` pass.

## Post-restart recovery on 2026-09-23

An uncontrolled Windows/WSL/Docker restart resumed `hawks-minio` against the
ordinary Ubuntu ext4 directory while the XFS VHDX was detached. The console
therefore showed no buckets and survey imagery was unavailable. MinIO was
stopped immediately; the empty backend contained only a newly initialized
`.minio.sys` directory and no workshop objects.

The VHDX and expected XFS UUID were intact. Recovery attached and mounted the
configured disk, removed only MinIO's stopped stale ext4 Docker bridge, and
recreated only the `minio` service from the authoritative Compose definition.
Image, environment, command, healthcheck, ports, network, aliases, and bind
configuration matched the preserved service; restart policy was restored to
`no`. The startup helper was corrected to start the required manual Hyper-V
service, attach when `blkid -U` returns the expected absent-device code, and
stop an already-running non-XFS MinIO instance before further work.

Post-recovery checks pass: the container is healthy with `/data` on XFS, all
five buckets (`exports`, `hawks-assets`, `pointclouds`, `temp`, and `tiles`)
are visible, the health endpoint returns 200, the representative
`AH-0260001` tile returns 200 as `image/png`, capacity reserves pass, and an
additional helper run is idempotent. This incident does not replace the still
required planned restart test; it demonstrates that restart ordering remains
an acceptance risk.

The machine-local Compose `minio` service now also declares restart policy
`no`, matching the live container and the guarded manual-start contract. This
configuration correction did not recreate or restart the running service. The
planned acceptance restart is deferred until the active `AH-026095` pipeline
run and WebODM processing finish and still requires explicit approval
immediately before restarting Windows.

## Coordinated restart acceptance on 2026-09-23

The user paused `AH-026095` and approved the maintenance window. Pre-restart
health, expected XFS UUID, five buckets, capacity, a representative PNG tile,
and a 58,328,382-byte point cloud passed. WebODM was stopped through its
authoritative Compose project and MinIO was stopped with restart policy `no`.

After Windows, WSL, and Docker restarted, MinIO and WebODM remained stopped,
Compose still resolved MinIO restart policy `no`, and the expected XFS UUID was
absent before guarded startup. The helper attached the exact VHDX but MinIO
observed `ext2/ext3` through Docker Desktop's stale pre-mount bind bridge. The
helper stopped MinIO, so no upload or XFS write was redirected. This is the
documented failure condition; the coordinated restart acceptance test failed.

Recovery mounted UUID `a86d906b-9286-4cf8-ae7e-911ce24e59db` as XFS, removed
only the stopped MinIO container definition, unmounted only its verified stale
Docker Desktop bridge, and recreated only the `minio` Compose service without
starting it. Configuration parity passed for pinned image, restart policy,
bind source, network, ports, and healthcheck. The guarded helper then passed
and an idempotent run through the documented npm command also passed. MinIO is
healthy with `/data` on XFS, all five buckets remain present, health returns
200, and the representative tile and point cloud match their pre-restart HTTP
status, content type, and byte length. Anonymous tile, point-cloud, and
malformed protected requests return 401; the anonymous survey route redirects
to login.

The test also exposed a Windows PowerShell path-resolution defect in the
helper's default parameter. Default config resolution now occurs in the script
body, and the exact elevated `npm run minio-storage:start` command passes.
Stronger mount-order orchestration is required before repeating restart
acceptance. Wave 3 remains blocked. Signed-in Survey/Orthomap rendering and
console/network checks still need a final manual browser confirmation because
the browser-control runtime did not reconnect after Windows restarted.

## Stronger mount-ordering acceptance on 2026-09-23

Docker Desktop automatic sign-in startup is disabled in its machine-local
settings and its exact Windows Run entry is absent. MinIO remains restart
policy `no` in both the live container and machine-local Compose file. The
single elevated `npm run minio-storage:start` command now owns the guarded
startup sequence; it does not start WebODM, the geospatial pipeline, or Wave 3.

The repeat coordinated restart confirmed that Docker Desktop, its engine,
MinIO, and the XFS UUID were all absent before the helper ran. Cold-start
testing exposed and corrected Windows PowerShell native-stderr handling and a
WSL idle-lifecycle race. The helper now holds an explicit WSL client while it
attaches and mounts the VHDX, waits for Docker readiness in Windows and Ubuntu,
and rechecks XFS before recreating only MinIO.

Docker Desktop then retained the configured XFS filesystem through its Ubuntu
bind bridge even though a later independent Ubuntu shell exposed the ordinary
ext4 path underneath. Idempotent validation now recognizes this state only
when the exact configured UUID is mounted as XFS under
`/mnt/wsl/docker-desktop-bind-mounts/Ubuntu-22.04/`, the container bind source
is unchanged, and `/data` reports XFS. This supersedes treating the later
source-path view alone as authoritative.

The accepted cold start created container
`e64f0dc3529a5491ff085eea053d1dcf483cd544c1edec63486ff6697f27528f`
from the pinned image with restart policy `no`, the expected network and
9000/9001 bindings, and a healthy XFS-backed `/data`. All five buckets are
present. Health returned 200, the representative PNG returned 200 and 766
bytes, and the representative point cloud returned 200 and 58,328,382 bytes.
The host reserve passed with 1,629,000,114,176 bytes available against
592,665,072,640 protected bytes; XFS passed with approximately
928,152,915,968 bytes available against 49,975,585,997 protected bytes.
Workshop regression remains 21/21, and PowerShell/JSON parsing and whitespace
checks pass. Wave 3 was not started.

The user then passed the final signed-in post-restart smoke: Survey
orthomosaic, 3D point cloud, BARBCO2026 Orthomap, authorized access,
cross-scope denial, all five MinIO buckets, and clean browser console/network
checks. Storage relocation and mount-order restart acceptance are complete.

## NGINX and MinIO edge hardening on 2026-09-23

The machine-local NGINX healthcheck now probes
`http://127.0.0.1/health`, avoiding the prior IPv6 `localhost` resolution.
Only the NGINX service was recreated from authoritative Compose configuration;
it is healthy and its app/protected-asset routes remain operational.

The machine-local MinIO service now publishes API and console ports only as
`127.0.0.1:9000` and `127.0.0.1:9001`. Windows shows only loopback listeners,
and connection attempts to the host LAN address on both ports fail. The pinned
image, restart policy `no`, network, service identity, bind source, healthcheck,
and XFS-backed `/data` contract remain intact.

Anonymous policies for `tiles` and `pointclouds` were narrowed from bucket
download/listing to exact GetObject only. Direct anonymous ListBucket requests
now return 403 for both buckets, while the representative PNG and point cloud
still return 200. This limited origin behavior is required by the current
unsigned MinIO upstream: NGINX authorizes each public asset request through
`auth_request` and then proxies the exact object over the internal Docker
network. Anonymous protected requests through NGINX continue to return 401.
Fully private buckets would require a separately designed signed S3 upstream.

The checked-in startup helper/config example now require exactly one expected
host IP and port binding for each MinIO port. A PowerShell single-element array
edge case found by the first fail-closed run was corrected; the recovery run
passed and a true second run preserved container ID, start time, running state,
and health. The helper reverified XFS, both capacity reserves, all five buckets,
and both representative objects. TypeScript, workshop regression 21/21,
PowerShell/JSON parsing, machine-local Compose validation, and
`git diff --check` pass. WebODM remains stopped.

The user completed the final signed-in browser smoke after the policy and port
changes. Survey `AH-0260001` rendered its orthomosaic and point cloud,
BARBCO2026 Orthomap rendered its tiles, authorized access succeeded,
cross-scope access remained denied, and the browser console/network showed no
new storage errors. NGINX/MinIO edge-hardening acceptance is complete.

## Remaining acceptance and risks

- Continue manual startup exclusively through the guarded helper. Do not
  re-enable Docker Desktop automatic startup until a separately tested
  mechanism can guarantee the same ordering and retained-bridge checks.
- Exact-object origin reads remain intentionally possible from the local host
  loopback and internal Docker network. They are not reachable through the
  host LAN bindings; NGINX remains the public authorization boundary.
- The rollback copy is a pre-upload snapshot. Do not delete it or write new
  Wave 3 objects until final acceptance and the separate upload approval.

## Wave 3 gate

The old Wave 3 configuration, checksum, and zero-byte state remain historical
evidence and are stale under the new dual-capacity policy. Do not resume them.
After the remaining storage/application/security checks pass, regenerate the
same `AH-026023`, `AH-026024`, and `AH-026028` scope, review and freeze the new
configuration, record its checksum, and request separate upload approval.
