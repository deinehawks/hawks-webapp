# Protected Asset Delivery State

Last updated: 2026-08-04

Chosen direction: NGINX proxy with MinIO internal offloading.

Workshop protection model:

- All users authenticate before using the application.
- Anonymous users must never load workshop GIS assets.
- Tiles, point clouds, detections, and outputs share the same protection level.
- Authorization is organization-scoped for the workshop release.
- Survey-specific grants are deferred unless separately required.
- Cloudflare may cache protected assets only after authentication/authorization.
- Temporary access lifetime target is 30 minutes.
- Delayed expiration after access removal is acceptable.
- Direct large point-cloud downloads are acceptable for the workshop.

Open implementation choices:

- Exact NGINX authorization mechanism.
- Exact MinIO bucket/prefix layout.
- Signed URL, signed cookie, or internal `auth_request` pattern.
- Cloudflare cache rules for protected paths.
- Supabase manifest table schema and audit fields.

Primary reference: `docs/workshop-manifest-gate-decisions.md`.
