# Workshop Manifest Gate Decisions

Last updated: 2026-08-04

This document records the current decisions for the Phase 3I-A workshop manifest gate, real manifest location, and protected asset delivery approach.

These decisions apply to the September 28-30, 2026 invited public-internet workshop deployment and the October 1-9, 2026 stabilization, documentation, and handoff window.

## 1. Manifest Gate Decision

Decision status: approved by project lead verbal approval.

Approver:

- The project lead is the final approver for the workshop manifest before migration or exposure begins.

Invited cohort:

- The invited workshop cohort list already exists.
- The populated manifest must include all selected 2026 datasets available for those invited users.

Manifest scope:

- Include application accounts or account references.
- Include organizations or cooperatives.
- Include legacy clients.
- Include farms or plantation areas.
- Include surveys.
- Include GIS tiles.
- Include point cloud datasets.
- Include detection files.
- Include outputs and reports.

Data minimization:

- Exclude unnecessary personal data from the checked-in sanitized manifest.
- Use opaque IDs, internal references, or secure external roster references where possible.
- Do not commit names, emails, phone numbers, private hostnames, secrets, passwords, service-role values, exact sensitive asset locations, or full private operational details.

Dataset window:

- The workshop manifest should include all relevant 2026 datasets for the invited cohort.
- Non-invited clients and non-2026 historical datasets remain outside the workshop migration unless separately approved.

Checksums:

- Checksums are not required for this workshop manifest because the project lead has already checked the datasets.
- File counts, byte counts, or source/destination references may still be useful for operational verification, but they are not approval blockers unless the project lead later requires them.

Approval evidence:

- Verbal approval by the project lead is sufficient for this phase.
- The decision should still be recorded in this document and reflected in the manifest metadata.

## 2. Real Manifest Location Decision

Recommended system of record:

- Store the real populated manifest in private Supabase tables.
- Back up manifest exports to a private MinIO object storage bucket.

Rationale:

- Supabase is already the application data system and can enforce authenticated access, RLS, audit fields, and relational references.
- A table-based manifest can reference organizations, profiles, clients, surveys, farms, and outputs without duplicating too much private data.
- Supabase makes it easier to build later platform-admin review UI or migration tooling.
- MinIO backups provide restorable snapshots without exposing the live table or committing private data to Git.

Recommended table shape:

- `workshop_manifests`: one row per manifest version, such as `manifest-2026-09-15`.
- `workshop_manifest_entries`: scoped rows for accounts, organizations, clients, farms, surveys, assets, outputs, tests, and rollback references.
- `workshop_manifest_audit_log`: append-only audit trail of create/update/approval/export events.

Recommended read access:

- Project lead.
- Platform admins.
- Deployment/database operators who need the manifest for migration and validation.
- Codex may read the manifest when explicitly authorized by the project lead for planning, validation, or migration support.

Recommended edit access:

- Project lead as final approver.
- A small approved operator group for data entry or correction.
- All edits should be audited.
- Avoid broad direct SQL editing after the manifest is approved; prefer controlled server actions, migration scripts, or admin UI workflows once implemented.

Versioning:

- Use short manifest IDs such as `manifest-2026-09-15`.
- Keep immutable approved snapshots.
- If changes are needed after approval, create a new version rather than overwriting the approved one.

Backup:

- Export approved manifest snapshots to a private MinIO bucket.
- Recommended path pattern: `private-manifests/workshop/manifest-2026-09-15.json`.
- Backups should not be publicly accessible through NGINX or Cloudflare.

## 3. Protected Asset Delivery Decision

User access model:

- All users must authenticate before opening their accounts.
- Anonymous users must never be able to load workshop GIS assets.
- All asset classes share the same protection level for the workshop.

Protected delivery approach:

- Use NGINX proxy with MinIO internal offloading.
- NGINX is the public-facing asset endpoint.
- MinIO storage URLs should not be exposed directly to browsers.
- The client application consumes assets through stable NGINX routes.

Access scope:

- Protect assets by organization for the workshop release.
- Survey-specific grants remain deferred unless separately required.
- Organization membership is the controlling access boundary for GIS assets in this phase.

Caching:

- Cloudflare should cache assets only after authentication/authorization.
- Do not make restricted asset paths broadly public-cacheable.
- Separate public/static assets from protected workshop GIS assets by path and cache policy.

URL lifetime:

- If signed or temporary access tokens are used, use a 30-minute validity window.
- Delayed expiration is acceptable when a user loses access.

Point clouds:

- Direct large point-cloud downloads are acceptable for the workshop.
- Keep monitoring and fallback expectations because browser memory, GPU, and network limits remain risks.

Detections, tiles, and point clouds:

- Use the same protection level.
- Do not allow anonymous access.
- Keep delivery behind authenticated organization access.

## 4. Recommended Implementation Direction

Start with NGINX route parity:

- `/asimov-hawks/` -> Next.js application container.
- `/asimov-hawks/_next/` -> Next.js application container.
- `/asimov-hawks/tiles/` -> protected NGINX route backed by MinIO.
- `/asimov-hawks/3d/` -> protected NGINX route backed by MinIO.

Then add an authorization gateway:

- The browser requests the stable NGINX asset URL.
- NGINX checks authorization through an internal auth service or app endpoint.
- If authorized, NGINX internally proxies/offloads to MinIO.
- If unauthorized, NGINX returns `401` or `403`.

Recommended authorization checks:

- User is authenticated.
- User has active organization membership.
- Requested asset belongs to the user's organization.
- User is not removed or suspended.
- Anonymous and cross-organization requests fail closed.

## 5. Open Design Details

These are not blockers to the decision, but they must be designed before production cutover:

- Exact NGINX auth mechanism: `auth_request`, signed cookie validation, internal app endpoint, or another equivalent pattern.
- Exact MinIO bucket and prefix layout.
- Exact Supabase table schema for `workshop_manifests` and audit logs.
- Whether the first manifest is entered manually in Supabase, imported from JSON, or generated from an approved private roster.
- Whether 30-minute access is implemented through signed cookies, signed URLs, or short-lived internal authorization cache.
- Cloudflare cache rules for protected asset paths.

## 6. Acceptance Criteria

The Phase 3I-A gate can proceed when:

- The real manifest exists in private Supabase storage or approved temporary private storage.
- The manifest uses a short versioned ID such as `manifest-2026-09-15`.
- A private MinIO backup exists for the approved manifest snapshot.
- Personal data is minimized or excluded from checked-in files.
- All invited 2026 accounts, organizations, clients, farms, surveys, tiles, point clouds, detections, outputs, and reports are represented.
- Checksums are explicitly marked as not required for this workshop approval.
- Protected asset delivery is organization-scoped.
- Anonymous access is denied.
- Cross-organization access is denied.
- Cloudflare does not publicly cache restricted assets.
- The project lead verbally approves the manifest before migration or exposure.
