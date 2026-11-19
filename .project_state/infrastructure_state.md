# Infrastructure State

Last updated: 2026-08-04

Initial local self-hosted infrastructure is running on WSL + Docker.

Completed:

- NGINX is deployed as the Docker reverse proxy and entry point.
- NGINX health check is operational.
- Object storage is deployed and integrated.
- GIS tiles and point cloud datasets are being migrated out of Next.js `public/`.
- Public access is limited to asset buckets that need direct browser access.
- NGINX is the public-facing endpoint instead of raw storage URLs.
- Prometheus, Grafana, Alertmanager, Node Exporter, NGINX Prometheus Exporter, and object storage metrics are operational.

Not yet integrated:

- Next.js application container.
- Docker Compose app service.
- NGINX routing to the app container.
- Production environment variables.
- Frontend GIS asset URL configuration for NGINX/object storage.
- Cloudflare DNS, TLS, caching, security, and rate limiting.

Primary reference: `docs/infrastructure-status.md`.
