# Protected Asset Delivery Design State

Last updated: 2026-08-04

Primary reference: `docs/protected-asset-delivery-design.md`.

Design drafted:

- NGINX remains the public endpoint for `/asimov-hawks/tiles/*` and `/asimov-hawks/3d/*`.
- MinIO remains internal.
- Cloudflare bypasses cache for protected GIS paths in v1.
- NGINX uses `auth_request` to `/asimov-hawks/internal/asset-auth`.
- Internal Next.js auth endpoint validates Supabase session cookies and organization access.
- Authorized endpoint responses return `204` plus `X-Asset-Upstream-URI`.
- Denied requests return browser-facing `401`.
- Manifest lookup uses the approved `workshop_manifests` and `workshop_manifest_entries`.
- Manifest storage fields use opaque aliases resolved by private deployment config.
- Detections remain server-side through Supabase Storage for v1.
- Direct point-cloud downloads up to 1 GB are accepted with fallback message.

Open implementation details:

- exact NGINX syntax for Docker Compose;
- exact alias-to-MinIO environment configuration;
- active approved manifest selection;
- optional short authorization cache;
- asset request logging fields.
