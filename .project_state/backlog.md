# Backlog

Last updated: 2026-08-05

## P1

- Keep this repo strictly Next.js app-side for protected asset work; NGINX/Compose config belongs to the existing external WSL Docker infrastructure.
- Review and commit the external NGINX checklist, local smoke-test runbook, Phase 2 asset URL helper, and WSL NGINX milestone notes.
- Define the concrete MinIO migration layout for approved workshop GIS assets, including whether to preserve legacy route-compatible paths under `hawks-assets/tiles/...` or use the opaque alias/prefix layout.
- Write executable rollback runbook for app image, NGINX config, MinIO prefixes, Supabase manifest supersession, and Cloudflare rules.
- Confirm target environment before any remote Supabase migration apply.

## P2

- Containerize Next.js with standalone output and a `.dockerignore` excluding secrets, GIS assets, local backups, and generated datasets.
- Add Next.js service to Docker Compose and route `/asimov-hawks`, `/_next`, `/tiles`, and `/3d` through NGINX.
- Execute local protected-asset route smoke tests after external WSL NGINX auth_request wiring is ready.
- Refresh application validation baseline for lint, type-check, build, and NGINX smoke tests.

## P3

- Authorized Cloudflare caching for protected assets beyond v1.
- Full historical dataset migration.
- Broad infrastructure automation and Kubernetes.
- Advanced analytics, DAM, destructive workflows, and large asset reorganization.
- General multi-organization account access.