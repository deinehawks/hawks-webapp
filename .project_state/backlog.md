# Backlog

Last updated: 2026-08-04

## P1

- Keep this repo strictly Next.js app-side for protected asset work; NGINX/Compose config belongs to the existing external WSL Docker infrastructure.
- Review and commit the protected asset app/RPC/test slice, then move to local route smoke tests or frontend point-cloud fallback handling.
- Define organization-scoped MinIO bucket/prefix layout and opaque alias mapping for protected workshop GIS assets and private manifest backups.
- Write executable rollback runbook for app image, NGINX config, MinIO prefixes, Supabase manifest supersession, and Cloudflare rules.
- Confirm target environment before any remote Supabase migration apply.

## P2

- Containerize Next.js with standalone output and a `.dockerignore` excluding secrets, GIS assets, local backups, and generated datasets.
- Add Next.js service to Docker Compose and route `/asimov-hawks`, `/_next`, `/tiles`, and `/3d` through NGINX.
- Add Phase 2 asset URL helper using `NEXT_PUBLIC_ASSET_BASE_URL ?? "/asimov-hawks"` after NGINX route parity works.
- Refresh application validation baseline for lint, type-check, build, and NGINX smoke tests.

## P3

- Authorized Cloudflare caching for protected assets beyond v1.
- Full historical dataset migration.
- Broad infrastructure automation and Kubernetes.
- Advanced analytics, DAM, destructive workflows, and large asset reorganization.
- General multi-organization account access.