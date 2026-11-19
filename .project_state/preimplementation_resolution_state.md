# Pre-Implementation Resolution State

Last updated: 2026-08-04

Primary reference: `docs/pre-implementation-review-resolutions.md`.

Resolved:

- Bypass Cloudflare cache for protected GIS assets in v1.
- Use NGINX `auth_request` to a dedicated internal Next.js auth endpoint.
- Design minimal Supabase manifest schema/RLS/audit before implementation.
- Use organization-scoped asset authorization; ambiguous shared surveys must be deferred or explicitly excepted.
- Preserve hardcoded `/asimov-hawks` asset routes in Phase 1; add `NEXT_PUBLIC_ASSET_BASE_URL ?? "/asimov-hawks"` helper in Phase 2.
- Keep separate lint/type/build/smoke-test validation evidence.
- No checksums, but require object counts, byte totals, sample tile checks, zoom-range checks, and map smoke tests where practical.
- Treat tile-scope amendment as authoritative.
- Keep detections server-side through Supabase Storage for v1.
- NGINX, not Next middleware, is the protected asset boundary.
- Write rollback runbook before cutover.
- Workshop point-cloud acceptance bound is 1 GB.
- `platform_admin` can edit manifests; edits must be audited.
