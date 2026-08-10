# Pre-Implementation Final Decisions State

Last updated: 2026-08-04

Primary reference: `docs/pre-implementation-review-resolution-addendum.md`.

Closed decisions:

- Manifest approver account: `visualization.hawks@gmail.com`.
- All `platform_admin` users may edit draft/reviewed manifests.
- Approved manifests are immutable; changes require superseding versions.
- Manifest approval should store a profile/user reference, with email only as human-readable context.
- Protected GIS asset authorization failures return `401`.
- Point-cloud fallback message: `This point cloud exceeds the supported loading limit.`
- Workshop point-cloud direct-download acceptance remains capped at 1 GB.

Remaining work is now implementation detail: Supabase manifest schema/RLS/audit, NGINX `auth_request`, MinIO prefixes, lightweight asset verification, and rollback runbook.
