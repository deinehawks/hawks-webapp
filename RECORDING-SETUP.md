# asimov-hawks V2 — local recording

## Dynamic runtime source

This section supersedes the older selection/catalog runtime instructions below.
V3 is now the publication source of truth. V2 keeps the old interface but loads
the signed-in user's surveys from
`list_authorized_published_survey_assets()`, subject to Supabase RLS and exact
current ortho/point-cloud binding checks. The ignored
`.recording/selection.json`, `catalog.json`, and output bindings remain
historical migration evidence and may still be used by audit/build scripts;
they do not admit or hide surveys at runtime.

To add a survey after rollout: onboard/grant it in V3, create current output
metadata, save the protected-delivery draft, complete service verification, and
publish it as a platform admin. V2 then displays it automatically to authorized
accounts. Revocation, retirement, or loss of current-artifact agreement removes
it without a V2 code/catalog edit.

The required V3 schema/RPC migration is implemented and validated only in the
local development database. Do not restart the dynamic V2 checkout against
staging until that migration has passed backup, isolated rehearsal, explicit
staging approval and post-apply verification.

Independent Git clone, based on V2 commit 8e0e157c, branch
fix/v2-recording-compat. The existing checkout is asimov-hawks V3 and retains
its existing path. No commits or pushes are part of this setup.

## Current boundary

Staging output onboarding, manifest review and activation are complete. Full
ordinary-member browser acceptance remains pending. The isolated V2 NGINX proxy is
running on loopback port 8082; anonymous denial checks pass.
The independent clone and ignored configuration are created. Compatibility
changes are uncommitted. Dependencies are installed; 29/29 synthetic regression
tests and route type generation pass. Production build passes but retains the
original type/lint bypasses and reports Supabase Edge API warnings. Standalone
type-check fails in legacy UI (full baseline classification pending); lint fails
on the existing invalid "prefer const" rule. Platform-admin browser smoke passed;
the UEMPC member smoke remains pending.
Resume from
.project_state/session_handoff.md.
The migration has now completed and report audit passed, lifting the install/
build deferral. Do not restart Docker, WSL,
NGINX or MinIO. Do not rename V3 or change its runner files.

The checkout excludes tracked public/tiles and public/3d using sparse checkout.
Git history is independently copied, with no shared object store; historical
assets still occupy space inside .git. Do not disable sparse checkout.

## Local configuration

Run once from this clone:
Configuration has already completed in this checkout; do not rerun over it.

    node scripts/configure-recording.cjs "E:\dev\projects\webapps\asimov-hawks\V2\asimov-hawks"

This writes an ignored .env.local containing only the staging URL and anon key,
and ignored .recording/selection.json and source.json. It rejects other
projects, non-anon keys, duplicate selections and existing config. No DB
password, service-role key, MinIO credential, or source environment file is
copied. The app also checks the staging URL at runtime.

Use an existing active account approved through V3 Platform Admin. Platform
admins can use the dynamic published-survey recording checklist. Ordinary
members see only published assets returned through their signed-in
Supabase/RLS session. Inactive or missing profiles are signed out.
The recording copy redirects signup to login and its signup action cannot
create accounts. Missing dates/boundaries remain explicit; verified tile bounds
can supply view positioning without writing invented geometry or dates.
The private selection contains exactly the original 30 plus 28 additional
surveys; selecting a survey does not itself grant access to its assets.
Original survey IDs come from the 11 completed manifest-entry evidence files:
the editable V3 private allowlist currently contains one blank survey ID.
Additional IDs come from its approved 28-survey allowlist. The configuration
script leaves the stale V3 allowlist untouched.

## After the migration finishes

1. Confirm the batch exited successfully. Then run npm run recording:catalog.
   The builder requires all 21 original/additional reports, verifies every
   recorded object's existence and size evidence, counts, bytes, capacity,
   report completion, per-run stderr and unique coverage of 58 surveys.
   It generates an ignored catalog with exact routes, original PCD filenames,
   actual zoom levels, TMS-derived bounds and report hashes. It does not read
   tile files, upload, or contact MinIO/Supabase.
   Completed 2026-09-29: 21 reports, 58 surveys, 3,311,283 objects and
   201,134,174,000 bytes. Catalog already exists; do not blindly regenerate.
   Only nonempty stderr accepted is the exact historical organization Wave 001
   Node 20 warning, previously accepted in V3's
   docs/workshop-organization-wave-001-signoff-2026-08-28.md. Its SHA-256 is
   9851bc7baa7c23315a4983ebac4fe812ecfc941896dc8df99c9df50d3162c27d.
   Other nonempty logs fail closed. PowerShell JSON BOMs are supported.
2. Review the corrected cumulative manifest and missing staging output records.
   The old draft's six private MCS entries are invalid. Preserve active entries
   and use corrected organization protection. Backup, rehearse and obtain
   separate approval before any staging writes or activation. No production
   mutation is authorized.
   Read-only staging inventory on 2026-09-29: all 58 survey rows exist, 56
   lack dates, 56 lack current orthos, two have current point-cloud records,
   and no selected survey has active approved manifest coverage. Uploaded bytes
   alone do not satisfy these application/authorization gates.
3. Current orthomosaic records must match the verified tile variant. Current
   point-cloud records are required for PCD availability. Never fabricate
   dates, detections or output records. Additional surveys are orthomap-only.
4. Install with npm ci; generate Next route types if supported; run
   npx tsc --noEmit, npm run lint, npm run recording:test and a build.
   Record legacy V2 failures separately from introduced failures. Scripts use
   Node 22; the original npm lockfile is preserved.
5. Reserve app port 3200 and NGINX browser port 8082 after checking availability.
   Run npm run dev to bind Next to 127.0.0.1:3200.
   Do not run `npm run build` while that dev server is running: both commands
   write `.next`, which can leave the live page referencing missing CSS/JS.
   Stop the dev server before a build, or restart it immediately afterward.
   A separate loopback NGINX listener remains to be configured against the real
   machine-local stack. Use
   http://127.0.0.1:8082/asimov-hawks for the V2 member session so its auth
   cookie remains isolated from V3 admin on localhost:8080.
   Existing NGINX runs in Docker: its upstream must reach the Windows host
   through the validated bridge, not container localhost. If the loopback-only
   app cannot be reached from that container, use a separate host-local proxy
   or explicitly approve a tightly firewalled binding before proceeding.
   Do not silently expose V2 on all interfaces.
   Completed 2026-10-02 with a separate container named
   hawks-v2-recording-nginx bound only to 127.0.0.1:8082. Existing V3 NGINX on
   port 8080 was not edited, reloaded or replaced.
6. On that listener, proxy app pages to V2 and protect tiles/3D through
   /asimov-hawks/internal/asset-auth. Forward cookies and X-Original-URI,
   preserve GET/HEAD and Content-Length, and return 401 on denial.
   Honor X-Asset-Upstream-URI for internal MinIO routing; send private/no-store
   response headers. No protected cache or direct public MinIO access.
   Validate NGINX configuration before an approved reload.
   Syntax, health, app proxying, internal-route isolation, and anonymous
   tile/PCD denial pass. Authenticated inactive-manifest denial remains the next
   browser check.

The HTTP auth helper supports original safe PCD filenames; the active-manifest
RPC still authorizes the exact route and survey. The local catalog cannot
bypass authorization. Point clouds above the current 5 GiB application limit
show an explicit fallback. Multi-GiB browser parsing, memory and GPU behavior
still requires real-machine smoke.

## Exact output bindings

Verified asset existence does not itself select a survey output. The one-time
`npm run recording:bind-outputs` command reads the checksummed reviewed
metadata and writes ignored `.recording/output-bindings.json`; it refuses to
overwrite prior review.

The survey loader requires three values to agree before exposing a PCD:
`surveys.point_cloud`, a matching `point_clouds.code` row with
`is_current = true`, and an exact reviewed URL binding. Missing or mismatched
values fail closed. The generated bindings preserve AH-026012 and AH-026013
output identities and point counts; no database values are changed.

Legacy `odm.pcd` objects for those surveys were absent in loopback MinIO
checks. Their existing output identities therefore use the verified uploaded
filenames only as delivery routes. Nine other bindings remain unavailable in
the app until their reviewed output rows and survey pointers exist.

## Acceptance checklist

Open /dashboard/recording for the client-grouped 58-survey checklist.
Missing surveys, output records, dates, and verified asset metadata stay visible.
For every survey: check map renders, pan/zoom, available point clouds, and record
the clip filename and completion in a private checklist. A prepared row is not
proof of successful rendering.

Check login/logout/session refresh; active admin access; RLS-filtered ordinary
member access; checklist denial for non-platform-admin accounts; inactive account
and anonymous denial; anonymous and cross-scope asset denial; unknown/malformed
paths; exact PCD GET/HEAD;
orthomap-only/PCD-only/both/neither states; missing dates/bounds;
desktop recording resolution; and console/network errors.

Protected MinIO bytes, manifest authorization, staging outputs and browser
rendering must all pass before the recording application is called ready.
