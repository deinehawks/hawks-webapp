# Protected Asset Delivery Design

Last updated: 2026-08-04

Status: design contract only. Do not implement NGINX, MinIO, or application route changes until reviewed.

This document defines the v1 protected GIS asset delivery design for the ASIMOV-HAWKS workshop deployment. It follows the approved direction: NGINX is the public asset endpoint, MinIO remains internal, protected GIS assets bypass Cloudflare cache, authorization is organization-scoped, and unauthorized asset requests return `401`.

## Goals

- Move GIS tiles and point cloud datasets out of the Next.js `public/` directory.
- Preserve current browser-facing asset paths in Phase 1:
  - `/asimov-hawks/tiles/...`
  - `/asimov-hawks/3d/...`
- Keep MinIO URLs private and unreachable from browsers.
- Enforce authenticated organization-scoped access before asset delivery.
- Use NGINX `auth_request` with a dedicated internal Next.js authorization endpoint.
- Bypass Cloudflare cache for protected GIS assets in v1.
- Keep detections server-side through Supabase Storage for v1.

## Non-Goals

- Do not implement authorized Cloudflare edge caching in v1.
- Do not route detection JSON through NGINX/MinIO in v1.
- Do not support survey-specific grants unless a selected workshop dataset requires an explicit exception.
- Do not enumerate individual tile files in the manifest.
- Do not expose raw MinIO bucket names or credentials to the browser.

## Request Flow

```text
Browser
  |
  | GET /asimov-hawks/tiles/... or /asimov-hawks/3d/...
  v
Cloudflare
  |
  | cache bypass for protected GIS paths
  v
NGINX
  |
  | auth_request /internal/asset-auth
  v
Next.js internal auth endpoint
  |
  | validate Supabase session + organization access
  v
NGINX
  |
  | authorized: proxy internally to MinIO
  | denied: return 401
  v
MinIO
```

## Public Routes

Phase 1 should preserve the current app URL contract:

- `/asimov-hawks/` -> Next.js app container.
- `/asimov-hawks/_next/` -> Next.js app container.
- `/asimov-hawks/tiles/` -> NGINX protected route backed by MinIO.
- `/asimov-hawks/3d/` -> NGINX protected route backed by MinIO.

Phase 2 may add a frontend helper:

```ts
const assetBaseUrl =
  process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "/asimov-hawks";
```

## NGINX Authorization Contract

NGINX should protect GIS asset locations with `auth_request`.

Conceptual NGINX shape:

```nginx
location /asimov-hawks/tiles/ {
  auth_request /internal/asset-auth;
  auth_request_set $asset_upstream_uri $upstream_http_x_asset_upstream_uri;

  proxy_set_header Host $minio_host;
  proxy_pass http://minio:9000$asset_upstream_uri;
}

location /asimov-hawks/3d/ {
  auth_request /internal/asset-auth;
  auth_request_set $asset_upstream_uri $upstream_http_x_asset_upstream_uri;

  proxy_set_header Host $minio_host;
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
```

Final NGINX syntax may differ based on the existing compose/network setup. The important contract is:

- NGINX calls the internal auth endpoint before asset proxying.
- The auth endpoint receives the original URI and Supabase session cookies.
- The auth endpoint returns `2xx` only when the user can access the asset.
- Browser-facing denied requests return `401`.
- MinIO is not exposed directly.

## Internal Next.js Auth Endpoint Contract

Recommended route:

- `app/internal/asset-auth/route.ts`

Because the app has `basePath: "/asimov-hawks"`, NGINX should call:

- `/asimov-hawks/internal/asset-auth`

Request inputs:

- `Cookie`: Supabase auth cookies.
- `X-Original-URI`: original asset URI, such as `/asimov-hawks/tiles/<client>/<year>/<survey-id>/ortho/<tile-folder>/<z>/<x>/<y>.png`.

Response behavior:

- `204 No Content`: authorized.
- `401 Unauthorized`: unauthenticated, unauthorized, expired, suspended/removed, cross-organization, unmapped, malformed, or unknown asset.

Authorized response headers:

- `X-Asset-Upstream-URI`: internal MinIO object path to proxy.

Implementation requirements:

- Use the server Supabase client so session cookies are validated consistently.
- Call `auth.getUser()`; do not trust unsigned request data.
- Load the current profile and platform/organization context.
- Parse `X-Original-URI` into an asset request.
- Map the asset request to a manifest entry, survey, client, and organization.
- Allow platform admins.
- Allow active members of the owning organization.
- Deny anonymous and cross-organization access.
- Deny removed or suspended memberships.
- Return `401` for all denied cases.
- Never return real MinIO credentials.

## Asset Route Parsing

Current frontend paths:

```text
/asimov-hawks/tiles/<client-code>/<year>/<survey-id>/ortho/<tile-folder>/{z}/{x}/{y}.png
/asimov-hawks/3d/<client-code>/<year>/<survey-id>/odm.pcd
/asimov-hawks/3d/<client-code>/<year>/<survey-id>/lidar.pcd
```

The auth endpoint should validate:

- path starts with `/asimov-hawks/tiles/` or `/asimov-hawks/3d/`;
- asset type is `tile_group` or `point_cloud`;
- `survey-id` exists in the approved manifest;
- asset maps to one organization for v1;
- requested route is under the manifest entry's allowed route pattern;
- no path traversal, empty path segments, or unexpected file extensions.

## Manifest Lookup Contract

Use the approved manifest tables:

- `workshop_manifests`
- `workshop_manifest_entries`

Lookup rules:

- Use the current approved manifest version.
- Match route requests to manifest entries by `nginx_route_pattern`, `survey_id`, `entry_type`, and opaque storage aliases.
- `tile_group` entries represent roots/prefixes, not individual tile files.
- `point_cloud` entries represent `odm.pcd`, `lidar.pcd`, or equivalent approved point-cloud objects.
- Organization ownership comes from `workshop_manifest_entries.organization_id`.

If more than one approved manifest is active, fail closed until one active version is selected.

## MinIO Alias And Prefix Contract

Manifest rows should store opaque aliases. The storage layer resolves them to real MinIO buckets and prefixes.

Recommended logical layout:

```text
protected-gis-assets
  orgs/<organization-id>/clients/<client-id-or-code>/surveys/<survey-id>/
    tiles/<tile-folder>/{z}/{x}/{y}.png
    point-clouds/odm.pcd
    point-clouds/lidar.pcd

private-manifest-backups
  workshop/manifest-2026-09-15.json
```

Recommended aliases:

```text
storage alias: workshop-protected-gis
backup alias: workshop-private-manifests
prefix alias: org:<organization-id>/survey:<survey-id>/tiles:<tile-folder>
prefix alias: org:<organization-id>/survey:<survey-id>/point-clouds
```

The exact real MinIO bucket names and internal prefixes should live in private deployment configuration, not public Git.

## Cloudflare Rules

Protected GIS paths:

- `/asimov-hawks/tiles/*`
- `/asimov-hawks/3d/*`

V1 decision:

- Bypass Cloudflare cache.
- Do not publicly cache protected GIS assets.
- Do not expose MinIO origin URLs.

Allowed caching:

- Next.js immutable static chunks under the normal `_next/static` path.
- Public non-sensitive assets only.

## Detections

Detections remain server-side through Supabase Storage for v1.

Reason:

- Existing detection reads already go through server-side tenant checks.
- Moving detections into NGINX/MinIO would expand scope and risk for the first protected asset cutover.

Testing must still confirm detection access is tenant-safe.

## Point-Cloud Limit And Fallback

Workshop v1 accepts direct point-cloud downloads up to 1 GB.

If a point cloud exceeds the supported limit or cannot be loaded due to size, show:

```text
This point cloud exceeds the supported loading limit.
```

Operational expectations:

- Test at least one representative large point cloud.
- Configure NGINX/MinIO timeouts for large transfers.
- Monitor failed point-cloud loads.
- Distinguish oversized files from network/storage failures in logs.

## Lightweight Asset Verification

Checksums are not required. Before cutover, verify:

- expected object-storage prefixes exist;
- object counts where cheap;
- byte totals where cheap;
- sample tile checks;
- zoom-range checks;
- map smoke tests;
- point-cloud smoke tests;
- denied anonymous requests;
- denied cross-organization requests;
- allowed organization-member requests;
- Cloudflare cache bypass for protected paths.

## Acceptance Criteria

Protected asset delivery is ready for implementation when:

- NGINX `auth_request` endpoint path is accepted.
- Internal Next.js auth endpoint contract is accepted.
- Approved manifest lookup contract is accepted.
- MinIO alias and prefix strategy is accepted.
- Cloudflare protected GIS cache-bypass rule is accepted.
- `401` denied behavior is accepted.
- Detection split remains accepted.
- 1 GB point-cloud limit and fallback message are accepted.
- Lightweight verification checklist is accepted.

## Open Implementation Details

1. Exact NGINX config syntax for the local Docker Compose network.
2. Exact private environment variables for alias-to-MinIO resolution.
3. Whether the internal auth endpoint should use a short in-memory cache for positive authorization checks.
4. How the app selects the active approved manifest version if several approved versions exist.
5. Exact log fields for denied and failed asset requests.
