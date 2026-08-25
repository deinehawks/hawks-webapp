# Protected Asset Delivery State

Last updated: 2026-08-13

Chosen direction: NGINX `auth_request` with MinIO as the internal protected asset origin.

Current workshop protection model:

- All users authenticate before using protected application or GIS routes.
- Anonymous and cross-scope requests fail closed.
- Authorization is evaluated through platform-admin authority, active organization memberships, and applicable explicit resource grants against the active workshop manifest.
- Suspended/removed memberships and inactive/expired/revoked grants do not authorize access.
- Tiles and point clouds use the protected NGINX/MinIO flow; detections remain server-side through the approved storage path.
- Cloudflare bypasses public caching for protected GIS paths in v1.
- Direct large point-cloud downloads remain acceptable within the recorded workshop limits.
- `profiles.organization_id` is removed and is not an authorization fallback.

Implemented details, external handoff, validation, and rollback references are indexed in `.project_state/project_index.md` under supporting current protected-asset documents.
