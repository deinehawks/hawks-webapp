# Protected Asset Delivery Review Fixes

Last updated: 2026-08-04

This document records approved corrections from the protected asset delivery design review.

## 1. Cloudflare Cache Behavior

Decision:

- Protected GIS paths must bypass Cloudflare cache in v1.

Paths:

- `/asimov-hawks/tiles/*`
- `/asimov-hawks/3d/*`

Implementation requirement:

- Do not cache protected GIS assets at Cloudflare until a separate authorized-edge-cache design is approved.

## 2. NGINX Auth Endpoint And Middleware

Decision:

- NGINX `auth_request` remains the protected asset boundary.
- The internal Next.js auth endpoint must return clean auth-subrequest responses.

Implementation requirement:

- `/asimov-hawks/internal/asset-auth` must return `204` only for authorized asset requests.
- It must return `401` for unauthenticated, unauthorized, malformed, expired, suspended/removed, cross-organization, unmapped, or unknown asset requests.
- It must not redirect to login.
- It must not return HTML.
- It must not depend on browser navigation behavior.

Middleware implication:

- Next middleware must either exclude the internal asset auth endpoint from login redirects or explicitly special-case it so NGINX receives `401`, not a redirect.

## 3. Active Manifest Selection

Decision:

- Asset authorization should use exactly one active approved manifest for the dataset year.

Implementation requirement:

- Query `workshop_manifests` with `status = 'approved'`, `is_active = true`, and `dataset_year = 2026`.
- If zero or more than one row is found, fail closed with `401`.
- The schema enforces at most one active approved manifest per dataset year.

## 4. Supersession

Decision:

- An approved manifest may be marked `superseded` only when the replacement manifest is already approved and points back through `supersedes_manifest_id`.

Implementation requirement:

- The old manifest content remains unchanged.
- The old manifest is marked inactive.
- The new approved manifest becomes the only active approved version for the dataset year.

## 5. Creator And Audit Discipline

Decision:

- Manifest and manifest-entry `created_by` should default to the authenticated user for normal app workflows.
- Existing `admin_audit_log` remains the audit destination.

Implementation requirement:

- The manifest migration uses trigger guards to populate `created_by` when omitted.
- Behavior tests should cover `created_by`, approval, immutability, supersession, RLS denial, and audit rows.
