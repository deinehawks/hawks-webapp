# Protected Asset Implementation Plan

Last updated: 2026-08-04

Status: approved planning contract.

## Commit Baseline

Planning starts after commit `aa9f81d3` (`feat(workshop): add manifest gate and protected asset plans`).

## Scope

Implement v1 protected GIS asset delivery for workshop datasets:

- preserve browser-facing `/asimov-hawks/tiles/...` and `/asimov-hawks/3d/...` paths;
- protect those paths with NGINX `auth_request`;
- resolve opaque manifest aliases to private MinIO bucket/prefix config server-side;
- authorize by active 2026 approved manifest and organization membership;
- bypass Cloudflare cache for protected GIS assets;
- keep detections on the existing server-side Supabase Storage path for v1.

Repository boundary:

- This repository owns only the Next.js application implementation.
- NGINX, Docker Compose, MinIO deployment wiring, and Cloudflare rules live outside this repository in the existing WSL Docker infrastructure.
- This repository may document the NGINX contract, request/response headers, route assumptions, and smoke-test checklist, but should not add production NGINX or Compose config here.

## Implementation Sequence

1. Add app-side internal auth endpoint.
   - Create `app/internal/asset-auth/route.ts`.
   - Accept only `GET` or `HEAD` auth subrequests.
   - Read `X-Original-URI` and Supabase cookies.
   - Call `auth.getUser()`.
   - Return `204` with `X-Asset-Upstream-URI` only when authorized.
   - Return `401` for every denied or malformed case.

2. Add middleware exception.
   - Update `utils/supabase/middleware.ts` or `middleware.ts` so `/internal/asset-auth` never redirects to login.
   - Preserve the existing Supabase cookie-copying sequence.
   - The endpoint itself remains responsible for `auth.getUser()`.

3. Add asset route parser and guard helpers.
   - Recommended file: `lib/assets/protected-asset-auth.ts`.
   - Parse only:
     - `/asimov-hawks/tiles/<client-code>/<year>/<survey-id>/ortho/<tile-folder>/<z>/<x>/<y>.png`
     - `/asimov-hawks/3d/<client-code>/<year>/<survey-id>/odm.pcd`
     - `/asimov-hawks/3d/<client-code>/<year>/<survey-id>/lidar.pcd`
   - Deny path traversal, empty segments, unexpected extensions, non-2026 year, nonnumeric tile coordinates, and unsupported point-cloud names.

4. Add active manifest lookup.
   - Query `workshop_manifests` where `dataset_year = 2026`, `status = 'approved'`, and `is_active = true`.
   - Fail closed unless exactly one active approved manifest is returned.
   - Match entries by `entry_type`, `survey_id`, route pattern, and opaque alias fields.
   - Use `workshop_manifest_entries.organization_id` as the authorization organization.

5. Add organization authorization.
   - Platform admins are allowed.
   - Normal users are allowed only when `profiles.organization_id` matches the manifest entry organization.
   - Deny missing profile, missing organization, cross-organization access, suspended/removed membership state if represented in current schema, unknown survey, and inactive manifest.

6. Add MinIO alias resolver.
   - Recommended file: `lib/assets/minio-aliases.ts`.
   - Keep real buckets, hosts, and prefixes in private environment variables.
   - Do not expose real MinIO names in client code or manifests.
   - Return an internal URI path suitable for NGINX proxying, not credentials.

7. Hand off NGINX contract to the external WSL Docker infrastructure.
   - Do not add production NGINX or Compose config in this repo.
   - The external NGINX stack should protect `/asimov-hawks/tiles/` and `/asimov-hawks/3d/`.
   - It should proxy auth subrequests to `http://next-app:3000/asimov-hawks/internal/asset-auth`.
   - It should forward `Cookie` and `X-Original-URI`.
   - It should use `X-Asset-Upstream-URI` from the auth response to proxy internally to MinIO.
   - It should return browser-facing `401` on auth denial.

8. Add deployment environment contract.
   - Document required private variables for:
     - MinIO internal origin;
     - public protected route base;
     - alias-to-bucket mapping;
     - optional auth cache settings;
     - point-cloud size limit.
   - Do not use `NEXT_PUBLIC_*` for private MinIO data.

9. Add logging and rollback runbook.
   - Log request id, user id when known, profile role, organization id, asset type, survey id, decision, denial reason, upstream status, byte count when available, and elapsed time.
   - Avoid logging cookies, tokens, signed URLs, MinIO credentials, or full private object keys.
   - Write rollback steps for NGINX config, app image, MinIO prefixes, manifest activation/supersession, and Cloudflare cache rules.

## NGINX Draft

```nginx
location /asimov-hawks/tiles/ {
  auth_request /internal/asset-auth;
  auth_request_set $asset_upstream_uri $upstream_http_x_asset_upstream_uri;
  error_page 401 = @asset_unauthorized;

  proxy_set_header Host $minio_host;
  proxy_pass http://minio:9000$asset_upstream_uri;
}

location /asimov-hawks/3d/ {
  auth_request /internal/asset-auth;
  auth_request_set $asset_upstream_uri $upstream_http_x_asset_upstream_uri;
  error_page 401 = @asset_unauthorized;

  proxy_set_header Host $minio_host;
  proxy_read_timeout 10m;
  proxy_send_timeout 10m;
  proxy_pass http://minio:9000$asset_upstream_uri;
}

location = /internal/asset-auth {
  internal;
  proxy_pass http://next-app:3000/asimov-hawks/internal/asset-auth;
  proxy_pass_request_body off;
  proxy_set_header Content-Length "";
  proxy_set_header X-Original-URI $request_uri;
  proxy_set_header Cookie $http_cookie;
}

location @asset_unauthorized {
  return 401;
}
```

This must be adjusted against the actual Docker network and MinIO naming.

## Test Plan

- Unit-test parser helpers with valid tile, valid ODM, valid LiDAR, traversal, wrong year, wrong extension, empty segment, bad tile coordinates, and unsupported point-cloud name.
- Route-test internal auth endpoint:
  - anonymous returns `401`;
  - malformed route returns `401`;
  - unknown manifest entry returns `401`;
  - cross-organization user returns `401`;
  - organization member returns `204`;
  - platform admin returns `204`;
  - zero active manifests returns `401`.
- NGINX smoke-test:
  - anonymous tile request returns `401`;
  - authorized tile sample returns `200`;
  - authorized point cloud under 1 GB returns `200`;
  - missing MinIO object does not look like auth success in logs;
  - MinIO origin is not reachable directly from browser.
- Browser smoke-test:
  - survey map loads sample tiles;
  - 3D tab loads supported point cloud;
  - oversized point cloud shows `This point cloud exceeds the supported loading limit.`;
  - detection downloads still follow existing tenant-safe server path.
- Cloudflare check:
  - protected GIS paths bypass cache;
  - `_next/static` can keep normal immutable caching.

## Proceed Gate

Implementation should proceed after these are confirmed:

- this repo remains app-only and the external WSL Docker/NGINX location is known for later handoff;
- private env variable names for MinIO alias resolution are accepted;
- active manifest data exists locally or a safe seed fixture is approved;
- test user fixtures cover platform admin, same-organization member, and cross-organization user;
- Cloudflare bypass rule will be applied before protected GIS assets are exposed publicly.
