# Pre-Implementation Review Resolutions

Last updated: 2026-08-04

This document records decisions made after the pre-implementation review for workshop manifest, Docker/NGINX integration, protected GIS asset delivery, and production-readiness risks.

## Resolved Decisions

### 1. Cloudflare Caching For Protected GIS Assets

Decision:

- Bypass Cloudflare cache for protected GIS assets in v1.

Rationale:

- Protected GIS assets are organization-scoped.
- Safe authenticated edge caching is more complex than the workshop release needs.
- A cache-bypass policy reduces authorization leakage risk.

Implementation note:

- Configure Cloudflare rules so protected paths such as `/asimov-hawks/tiles/...` and `/asimov-hawks/3d/...` are not publicly cached.
- Static Next.js assets may still use normal immutable caching.

Proceed:

- Yes for implementation.
- Do not enable Cloudflare caching for protected GIS paths before a separate authorized-cache design is approved.

### 2. NGINX Authorization Mechanism

Decision:

- Use NGINX `auth_request` to a dedicated internal Next.js authorization endpoint.

Rationale:

- NGINX remains the public asset endpoint.
- MinIO remains internal.
- Next.js can validate Supabase session cookies and organization membership using existing server-side auth patterns.
- NGINX can serve or proxy large assets without routing all bytes through the application process.

Target request flow:

1. Browser requests `/asimov-hawks/tiles/...` or `/asimov-hawks/3d/...`.
2. NGINX calls an internal Next.js auth endpoint with the original URI and session cookies.
3. Next.js validates authentication and organization access.
4. If allowed, NGINX internally proxies/offloads to MinIO.
5. If denied, NGINX returns `401` or `403`.

Proceed:

- Yes, but implement the auth endpoint and NGINX route together.
- Do not rely on Next middleware as the asset authorization boundary.

### 3. Minimal Supabase Manifest Schema

Decision:

- Design a minimal Supabase schema before implementing the real manifest.

Recommended tables:

- `workshop_manifests`
- `workshop_manifest_entries`
- `workshop_manifest_audit_log`

Minimum `workshop_manifests` fields:

- `id uuid primary key`
- `manifest_key text unique not null`, for example `manifest-2026-09-15`
- `status text not null`, limited to `draft`, `reviewed`, `approved`, `superseded`
- `dataset_year integer not null`, expected `2026`
- `approved_by uuid null`
- `approved_at timestamptz null`
- `created_by uuid not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `minio_backup_bucket text null`
- `minio_backup_object_key text null`
- `notes text null`

Minimum `workshop_manifest_entries` fields:

- `id uuid primary key`
- `manifest_id uuid not null references workshop_manifests(id)`
- `entry_type text not null`, such as `account`, `organization`, `legacy_client`, `farm`, `survey`, `tile_group`, `point_cloud`, `detection`, `output`, `report`
- `organization_id uuid null`
- `client_id uuid null`
- `survey_id uuid null`
- `reference_key text not null`
- `source_ref text null`
- `destination_ref text null`
- `nginx_route_pattern text null`
- `protection_level text not null default 'organization'`
- `metadata jsonb not null default '{}'::jsonb`
- `verification jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Minimum `workshop_manifest_audit_log` fields:

- `id uuid primary key`
- `manifest_id uuid null references workshop_manifests(id)`
- `entry_id uuid null references workshop_manifest_entries(id)`
- `actor_profile_id uuid null`
- `event_type text not null`
- `event_at timestamptz not null default now()`
- `details jsonb not null default '{}'::jsonb`

Access:

- `platform_admin` can read and edit draft/reviewed manifests.
- `platform_admin` can approve manifests if acting as the project lead.
- Approved manifests should be immutable except by creating a superseding manifest version.
- All edits and approvals must be audited.

Proceed:

- No database implementation should start until the exact migration/RLS is reviewed.

### 4. Organization-Only Authorization For Shared Surveys

Decision:

- Use organization-scoped asset authorization for v1.
- During manifest review, every included survey asset must be assigned to exactly one authorized organization for workshop purposes.
- If a survey is shared across organizations, either defer it or explicitly add a separate reviewed exception before migration.

Proceed:

- Yes, if manifest entries include the organization that owns access for each asset group.
- Do not migrate ambiguous shared survey assets until classified.

### 5. Hardcoded App Asset URLs

Decision:

- Phase 1 preserves existing routes through NGINX.
- Phase 2 adds a small asset URL helper using `NEXT_PUBLIC_ASSET_BASE_URL ?? "/asimov-hawks"`.

Proceed:

- Yes for NGINX route parity.
- Do not treat hardcoded paths as final production architecture.

### 6. Build And Validation Gates

Decision:

- Docker build success is not enough.
- Keep separate validation evidence for lint, type-check, build, and smoke tests.

Recommended release gate:

- Run `npm run lint` and record known/pre-existing failures.
- Run `npx tsc --noEmit` and record known/pre-existing failures.
- Run `npm run build` and record whether Node heap limit remains.
- Smoke-test `/asimov-hawks`, auth confirmation, protected routes, tiles, point clouds, and detections through NGINX.
- Record failures as pre-existing or release-blocking.

Proceed:

- Yes for Docker prototype.
- No for production release acceptance without a recorded validation baseline.

### 7. Asset Verification Without Checksums

Decision:

- Checksums are not required.
- Lightweight verification is required.

Required lightweight verification:

- Expected object-storage prefixes.
- Object counts where cheap.
- Byte totals where cheap.
- Sample tile checks.
- Zoom-range checks.
- Map smoke tests.

Proceed:

- Yes, but do not cut over assets without lightweight verification evidence.

### 8. Tile Manifest Scope

Decision:

- The tile-scope amendment is authoritative.
- Do not enumerate individual tile files.
- Include tile groups, roots, or object-storage prefixes.

Proceed:

- Yes, if implementation follows `docs/workshop-manifest-gate-amendment-tiles.md`.

### 9. Detection Delivery Path

Decision:

- Keep detection JSON server-side through Supabase Storage for v1.
- Tiles and point clouds can move through NGINX/MinIO.
- The same protection outcome is required, but the transport mechanism may differ.

Rationale:

- Existing detection access is already server-side and tenant-checked.
- Moving detections into the new asset gateway adds risk and is not required for initial workshop delivery.

Proceed:

- Yes.
- Test detections separately from tile/point-cloud delivery.

### 10. Middleware Boundary

Decision:

- Next middleware is not the protected asset boundary.
- NGINX plus the internal authorization endpoint is the protected asset boundary.

Proceed:

- Yes, if NGINX protected routes are implemented as fail-closed.

### 11. Rollback Runbook

Decision:

- Create an executable rollback runbook before production cutover.

Required rollback sections:

- App image rollback.
- NGINX config rollback.
- MinIO asset prefix rollback.
- Supabase manifest rollback or supersession.
- Cloudflare cache/rule rollback.
- Trigger conditions and owner.

Proceed:

- Yes for implementation.
- No for production cutover without rollback runbook.

### 12. Point-Cloud Performance Bound

Decision:

- Direct large point-cloud downloads are acceptable for workshop.
- Maximum expected point-cloud file size for workshop acceptance is 1 GB.

Required checks:

- Verify NGINX and MinIO support the required transfer size.
- Configure reasonable timeouts.
- Test at least one representative large file.
- Provide fallback behavior if a point cloud fails to load.

Proceed:

- Yes, but do not demo or release untested 1 GB point-cloud paths.

### 13. Manifest Edit Authority

Decision:

- `platform_admin` users may edit the real manifest.
- Manifest edits must be audited.
- Approved manifest versions should become immutable and require supersession for later changes.

Proceed:

- Yes, after RLS/audit design is reviewed.

## Recommended MinIO Prefix Layout

Use organization-scoped prefixes for workshop assets:

```text
protected/
  orgs/
    <organization-id>/
      clients/
        <client-id-or-code>/
          surveys/
            <survey-id>/
              tiles/
                <tile-folder>/
                  {z}/{x}/{y}.png
              point-clouds/
                odm.pcd
                lidar.pcd
              outputs/
                ...

private-manifests/
  workshop/
    manifest-2026-09-15.json
```

Notes:

- Keep protected GIS assets outside public buckets.
- Keep manifest backups private and unreachable through public NGINX/Cloudflare routes.
- Preserve existing browser-facing paths through NGINX during Phase 1.

## Updated Implementation Order

1. Draft minimal Supabase manifest schema/RLS/audit migration for review.
2. Define MinIO bucket/prefix layout for organization-scoped workshop assets.
3. Containerize Next.js with standalone output and exclude GIS assets/secrets from the image.
4. Add app service to Docker Compose.
5. Configure NGINX route parity for `/asimov-hawks`, `/_next`, `/tiles`, and `/3d`.
6. Implement NGINX `auth_request` to a dedicated internal Next.js authorization endpoint for protected GIS assets.
7. Keep detections server-side through Supabase Storage for v1.
8. Add lightweight asset verification tooling or checklist.
9. Add Cloudflare cache bypass rules for protected GIS paths.
10. Write rollback runbook before cutover.

## Remaining Product/Technical Questions

1. What exact Supabase role or profile condition identifies the project lead who can approve manifests?
2. Should `platform_admin` edit access apply to all platform admins or only a named subset for the workshop?
3. Should NGINX protected asset auth return `401` for unauthenticated users and `403` for authenticated-but-denied users?
4. What exact object counts/byte totals are cheap enough to collect for the selected 2026 datasets?
5. What fallback should users see if a 1 GB point cloud fails to load?
