# Backlog

Last updated: 2026-08-10

## P1

- Diagnose local Next dev route timeouts that block `/asimov-hawks`, `/internal/asset-auth`, and protected tile smoke tests.
- Rerun authenticated NGINX/browser smoke tests against active staging manifest `manifest-2026-08-07` and real MinIO `tiles` bucket sample URLs for `AH-026005`.
- Decide whether to fix the lint config baseline now that `next lint` fails on the `prefer const` plugin issue.
- Confirm target environment before any additional remote Supabase migration apply.

## P2

- Resolve or formally baseline existing TypeScript errors in map/caller/helper components.
- Investigate `npm run build` heap exhaustion and document the accepted build command or memory setting.
- Containerize Next.js with standalone output and a `.dockerignore` excluding secrets, GIS assets, local backups, and generated datasets.
- Extend protected-asset smoke coverage from sample tiles to representative point clouds and map browser flows.

## P3

- Authorized Cloudflare caching for protected assets beyond v1.
- Full historical dataset migration.
- Broad infrastructure automation and Kubernetes.
- Advanced analytics, DAM, destructive workflows, and large asset reorganization.
- General multi-organization account access.
