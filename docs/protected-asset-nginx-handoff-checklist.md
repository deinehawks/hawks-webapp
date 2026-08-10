# Protected Asset External NGINX Handoff Checklist

Last updated: 2026-08-04

Status: external infrastructure checklist. The actual NGINX, Docker Compose,
MinIO, and Cloudflare config lives outside this Next.js repository.

## Boundary

This repository owns:

- `/asimov-hawks/internal/asset-auth`;
- protected asset parsing;
- Supabase session validation;
- manifest-backed authorization RPC usage;
- `X-Asset-Upstream-URI` response contract;
- frontend point-cloud load fallback behavior.

The external WSL Docker infrastructure owns:

- NGINX `auth_request` configuration;
- NGINX to MinIO internal proxying;
- Docker service/network names;
- MinIO bucket/prefix configuration;
- Cloudflare cache-bypass rules.

## Required NGINX Contract

Protected browser-facing paths:

- `/asimov-hawks/tiles/*`
- `/asimov-hawks/3d/*`

Internal auth subrequest target:

- `GET /asimov-hawks/internal/asset-auth`
- `HEAD /asimov-hawks/internal/asset-auth`

Required subrequest headers:

- `X-Original-URI: $request_uri`
- `Cookie: $http_cookie`
- empty request body

Expected app responses:

- `204` plus `X-Asset-Upstream-URI` means authorized.
- `401` means deny.
- The endpoint must not redirect and must not return HTML.

Required NGINX behavior:

- Run `auth_request` before proxying protected assets.
- Read `X-Asset-Upstream-URI` from the auth response.
- Proxy internally to MinIO only after a successful auth response.
- Return browser-facing `401` on auth denial.
- Support `HEAD` and `GET` for point-cloud paths.
- Preserve `Content-Length` on point-cloud `HEAD` responses when MinIO provides it.
- Do not expose MinIO hostnames, buckets, or credentials to browsers.

## Cloudflare Rule

Before public exposure, bypass Cloudflare cache for:

- `/asimov-hawks/tiles/*`
- `/asimov-hawks/3d/*`

Do not enable protected GIS edge caching in v1.

## Smoke Tests

Run these through the external public NGINX entry point, not directly against
Next.js or MinIO:

1. Anonymous tile request returns `401`.
2. Anonymous point-cloud `HEAD` request returns `401`.
3. Authenticated org-member tile request returns `200`.
4. Authenticated org-member point-cloud `HEAD` returns `200` with `Content-Length` when available.
5. Authenticated org-member point-cloud `GET` returns `200`.
6. Cross-organization tile request returns `401`.
7. Platform-admin tile request returns `200`.
8. Unknown tile route returns `401`.
9. Unknown point-cloud route returns `401`.
10. Direct browser access to MinIO is not possible.
11. Cloudflare response for protected GIS paths is not cached.
12. Browser map loads representative protected tiles.
13. Browser 3D tab loads a supported point cloud under 1 GB.
14. Browser 3D tab shows `This point cloud exceeds the supported loading limit.` for a point cloud over 1 GB.

## Troubleshooting Signals

If every protected asset returns `401`:

- verify NGINX forwards cookies;
- verify `X-Original-URI` includes the full `/asimov-hawks/...` asset route;
- verify one active approved 2026 manifest exists;
- verify manifest entries match `survey_id`, `entry_type`, and route pattern;
- verify the user belongs to the owning organization or is platform admin.

If auth succeeds but assets return `404` or `502`:

- verify `X-Asset-Upstream-URI` reaches the expected internal MinIO object path;
- verify the external NGINX config maps the upstream URI to the correct MinIO origin;
- verify object prefixes exist in MinIO;
- verify MinIO is reachable only from the Docker network.

If point-cloud fallback always shows failure:

- verify NGINX supports `HEAD` on `/asimov-hawks/3d/*`;
- verify auth is applied consistently to `HEAD` and `GET`;
- verify `Content-Length` is preserved when available;
- verify browser devtools show `401`, `404`, `502`, or an oversized response.
