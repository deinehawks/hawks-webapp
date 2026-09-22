# Hawks Infrastructure Status

Last updated: 2026-08-04

This document records the current local self-hosted infrastructure status and the recommended next integration steps for the ASIMOV-HAWKS web application. It is based on the current WSL + Docker setup report and a targeted application review of `next.config.ts`, asset URL references, and server-side storage access.

Repository evidence does not prove the current state of any remote staging or production environment. Treat this as local infrastructure status until external deployment and Cloudflare checks are completed.

## Current Local Infrastructure

The initial infrastructure stack is running in a local self-hosted environment on WSL + Docker.

### Reverse Proxy

- NGINX is deployed in Docker.
- NGINX is acting as the entry point and reverse proxy.
- A health check endpoint is configured and operational.
- Asset routing structure is being prepared for GIS tiles and point cloud datasets.

### Object Storage

- Object storage is deployed and integrated.
- GIS assets, including raster tiles and point cloud datasets, are being migrated out of the Next.js `public/` directory.
- Public access is configured only for asset buckets that need direct browser access.
- NGINX is used as the public-facing endpoint instead of exposing storage URLs directly.

### Monitoring

The monitoring stack is deployed and operational:

- Prometheus
- Grafana
- Alertmanager
- Node Exporter
- NGINX Prometheus Exporter

Prometheus targets are healthy and reporting metrics for:

- Prometheus
- Node Exporter
- NGINX Exporter
- Object storage metrics

Grafana is connected to Prometheus and receiving metrics successfully.

## Current Architecture

```text
User
  |
  v
Cloudflare (planned)
  |
  v
NGINX
  |
  v
Next.js Application (not yet integrated)

NGINX
  |
  v
Object Storage

Prometheus
  |
  v
Grafana
```

## Application Coupling Observed

The current application has a stable base path and hardcoded asset URL assumptions:

- `next.config.ts` sets `basePath: "/asimov-hawks"`.
- Survey map tiles currently load from `/asimov-hawks/tiles/...`.
- Organization orthomap tiles currently load from `/asimov-hawks/tiles/...`.
- Point clouds currently load from `/asimov-hawks/3d/...`.
- Detection JSON still loads server-side from the Supabase Storage bucket `detected-objects` through `lib/actions/surveys.ts`.

These paths make the safest first integration path clear: preserve the existing browser-facing URL contract through NGINX while moving the backing storage out of the Next.js runtime image.

## Recommended Integration Plan

### 1. Containerize The Next.js Application

Recommended approach:

- Add `output: "standalone"` to `next.config.ts`.
- Create a multi-stage Dockerfile:
  - install dependencies with `npm ci`;
  - build with `npm run build`;
  - copy the standalone output, static files, and required public assets into a runtime image;
  - run the standalone Next.js server.
- Add a `.dockerignore` that excludes:
  - `node_modules`;
  - `.next`;
  - `.env*`;
  - `public/tiles`;
  - `public/3d`;
  - local backups and generated asset datasets.

Important validation note: `next.config.ts` currently suppresses lint and TypeScript build failures. A successful Docker build must not replace separate lint, type-check, and smoke-test validation.

### 2. Add The App To Docker Compose

Add the application as an internal service behind NGINX. NGINX should be the only public entry point.

Suggested route split:

- `/asimov-hawks/` -> Next.js app container.
- `/asimov-hawks/_next/` -> Next.js app container.
- `/asimov-hawks/tiles/` -> object storage through NGINX.
- `/asimov-hawks/3d/` -> object storage through NGINX.

This preserves the app's current hardcoded tile and point-cloud URLs while allowing assets to leave `public/`.

### 3. Configure Runtime Environment

Required production environment should include at least:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- any production site URL or auth redirect URL values required by Supabase configuration

Do not provide `SUPABASE_SERVICE_ROLE_KEY` to the application container or deployment job. Service-role usage remains local/admin-only and approval-gated.

### 4. Move GIS Asset Delivery Behind NGINX

For the first integration pass, keep browser-facing paths stable and let NGINX route them:

- `/asimov-hawks/tiles/...`
- `/asimov-hawks/3d/...`

Recommended asset delivery behavior:

- Use immutable versioned object paths for workshop datasets when possible.
- Apply long cache headers only to public, immutable assets.
- Preserve TMS tile behavior and existing path shape until the frontend is updated deliberately.
- Ensure large point-cloud responses support appropriate timeouts and range requests where the storage backend and NGINX support them.
- Keep restricted survey assets separate from public assets at the path, bucket, and cache-policy levels.

### 5. Add Configurable Asset Base URLs

After NGINX route parity works, replace hardcoded asset roots with a small helper and environment variable.

Example target behavior:

```ts
const assetBaseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "/asimov-hawks";
```

Then tile and point-cloud URLs should be built from that asset base. This makes local development, Docker, Cloudflare, and future on-premise deployments easier to switch without changing every map component.

### 6. Prepare Cloudflare Integration

After the app is integrated behind NGINX:

- Configure DNS through Cloudflare.
- Enable HTTPS/TLS.
- Keep NGINX and object storage as origins; do not expose raw storage URLs publicly.
- Configure cache rules by path and asset sensitivity.
- Configure security settings and rate limits.
- Test anonymous, authenticated, permitted-organization, and denied cross-organization access through the Cloudflare hostname.

Suggested cache classes:

- Aggressive cache: immutable Next.js static chunks and approved public immutable GIS tiles.
- Careful cache or bypass: authenticated application pages, protected survey assets, detections, signed URLs, and any asset path whose authorization may vary by user or organization.

## Risks Before Production

- Public buckets can bypass tenant authorization if restricted survey assets are placed there.
- Cloudflare cache rules can leak restricted assets if public and protected paths are mixed.
- Current hardcoded `/asimov-hawks/tiles` and `/asimov-hawks/3d` paths are acceptable for first NGINX parity, but should become configurable before production hardening.
- Point clouds are loaded whole in the browser and may become a memory, GPU, network, and mobile-device bottleneck.
- Docker build success can be misleading because lint and TypeScript errors are currently ignored during Next.js build.
- The real workshop manifest location and protected asset delivery mechanism remain gating decisions.

## Recommended Next Actions

1. Containerize the Next.js application with standalone output and a `.dockerignore` that excludes GIS assets and secrets.
2. Add the app service to Docker Compose and route `/asimov-hawks`, `/asimov-hawks/_next`, `/asimov-hawks/tiles`, and `/asimov-hawks/3d` through NGINX.
3. Decide the protected asset delivery model before enabling Cloudflare caching for any restricted survey asset.

## Production Readiness Checks

Before production deployment, verify:

- `/asimov-hawks` loads through NGINX.
- Auth confirmation and protected dashboard routes work through NGINX.
- Static Next.js assets load under the base path.
- Tiles load from object storage through `/asimov-hawks/tiles/...`.
- Point clouds load from object storage through `/asimov-hawks/3d/...`.
- Detection data remains tenant-safe.
- Anonymous and cross-organization access to restricted assets fails closed.
- Cloudflare DNS, TLS, cache, and rate-limit behavior work from an external network.
- Monitoring dashboards show app, NGINX, host, and object-storage health.
- Rollback paths are documented and rehearsed for both application and asset changes.
