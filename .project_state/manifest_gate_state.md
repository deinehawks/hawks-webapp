# Manifest Gate State

Last updated: 2026-08-13

Phase 3I-A decisions are recorded in `docs/workshop-manifest-gate-decisions.md`; schema and implementation status are indexed in `.project_state/project_index.md`.

Approved direction:

- The project lead is final approver.
- The manifest is the allowlist for invited accounts, organizations, clients, farms, surveys, assets, outputs, and required 2026 workshop metadata.
- Unnecessary personal data is excluded from checked-in files; the real manifest remains private.
- Approved manifests are immutable and changes use a superseding version.
- Manifest changes and approvals are audited.
- Protected delivery uses NGINX with MinIO kept internal.
- Asset authorization is fail-closed through platform-admin authority, active memberships, or applicable explicit grants plus the active manifest.
- `profiles.organization_id` is removed and must not be used as an asset authorization shortcut.
- Cloudflare bypasses public caching for protected GIS paths in v1.
- Anonymous access is never allowed.
- Approved manifest snapshots are backed up to the private operational location.
