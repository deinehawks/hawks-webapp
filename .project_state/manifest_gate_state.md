# Manifest Gate State

Last updated: 2026-08-04

Phase 3I-A decisions are now recorded in `docs/workshop-manifest-gate-decisions.md`.

Approved direction:

- Project lead is final approver.
- Invited cohort list already exists.
- Manifest includes all account, organization, legacy client, farm, survey, tile, point-cloud, detection, output, and report scope for invited users' 2026 datasets.
- Unnecessary personal data is excluded from checked-in files.
- Checksums are not required for this workshop approval.
- Verbal approval by the project lead is sufficient and should be recorded.
- Real manifest should live in private Supabase tables.
- Approved manifest snapshots should be backed up to a private MinIO bucket.
- Codex may read the manifest when explicitly authorized.
- Protected asset delivery should use NGINX proxy with MinIO internal offloading.
- All workshop assets share the same protection level.
- Asset authorization is organization-scoped for this release.
- Cloudflare caches protected assets only after auth.
- Temporary access lifetime target is 30 minutes.
- Anonymous access is never allowed.
