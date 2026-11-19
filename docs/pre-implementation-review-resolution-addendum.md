# Pre-Implementation Review Resolution Addendum

Last updated: 2026-08-04

This addendum closes the remaining product and technical questions from `docs/pre-implementation-review-resolutions.md`.

## Manifest Approver

Decision:

- The manifest approver is the application user/account `visualization.hawks@gmail.com`.

Implementation interpretation:

- The Supabase manifest schema should record approval by profile/user reference, not only by email.
- The email may be used as the human-readable identifier, but implementation should resolve it to the relevant authenticated user/profile ID before writing `approved_by`.

## Manifest Edit Access

Decision:

- All `platform_admin` users may edit draft or reviewed manifest records.

Implementation interpretation:

- Approved manifests should remain immutable.
- Post-approval changes should create a superseding manifest version.
- All edits, approvals, exports, and supersessions must be written to the manifest audit log.

## Protected Asset Denial Status

Decision:

- Protected asset authorization failures should return `401`.

Implementation interpretation:

- NGINX protected GIS asset routes should fail closed.
- The internal auth endpoint used by NGINX `auth_request` should return `2xx` only when the request is authorized.
- Unauthorized, unauthenticated, expired, removed/suspended, or cross-organization requests should produce `401` for the browser-facing asset request.

## Point-Cloud Fallback Message

Decision:

- If a point cloud cannot load because it exceeds the accepted limit, show a user-facing message that it exceeds the limit.

Recommended message:

```text
This point cloud exceeds the supported loading limit.
```

Implementation interpretation:

- Workshop acceptance allows direct point-cloud downloads up to 1 GB.
- Point-cloud loading should detect or handle oversized/failed loads and display the fallback message instead of leaving a blank or broken 3D view.
- The app should still log enough detail for operators to distinguish oversized files from network or storage failures.

## Updated Remaining Decisions

The major pre-implementation product decisions are now closed for v1. Remaining work is implementation design and validation detail:

- exact Supabase migration/RLS/audit SQL;
- exact NGINX `auth_request` configuration;
- exact MinIO bucket and prefix provisioning;
- lightweight asset verification process;
- executable rollback runbook.
