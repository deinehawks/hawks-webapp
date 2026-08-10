# Backlog

Last updated: 2026-08-10

## P1

- Finish the `AH-026005` control sample by completing and verifying the remaining staged `round-corners/24` MinIO tile batches.
- Use `scripts/publish-protected-assets.js` with live MinIO credentials to publish `barbco2026/AH-0260001` tiles and ODM point cloud.
- Extend protected-asset smoke coverage beyond `AH-026005` to `barbco2026/AH-0260001` point-cloud and map browser flows.
- Confirm target environment before any additional remote Supabase migration apply.

## P2

- Decide whether to continue warning-only lint cleanup or switch to the dataset-light build heap baseline investigation.
- Investigate `npm run build` heap exhaustion and document the accepted build command or memory setting.
- Containerize Next.js with standalone output and a `.dockerignore` excluding secrets, GIS assets, local backups, and generated datasets.
- Authorized Cloudflare caching design for protected assets beyond v1.

## P3

- Full historical dataset migration.
- Broaden the publisher automation with manifest-prep helpers, resumable verification, and additional workshop clients after `barbco2026/AH-0260001` succeeds.
- Broad infrastructure automation and Kubernetes.
- Advanced analytics, DAM, destructive workflows, and large asset reorganization.
- General multi-organization account access.
