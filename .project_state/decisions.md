# Decisions

Last updated: 2026-08-13

## Current Decisions

- Keep the platform-admin and user experiences in one Next.js application and deployment, but use separate route trees and layouts.
- `platform_admin` will land on `/admin`; `user` will land on `/dashboard`.
- The current `/dashboard/admin/*` nesting is superseded and transitional. Preserve it through redirects during implementation.
- Users & Access for existing accounts is the first admin delivery wave.
- Effective-access preview is read-only. The authenticated actor remains the platform admin; no user-equivalent session, cookie, token, or mutation authority is issued.
- Every admin mutation must authenticate server-side, require platform-admin authority, rely on RLS, validate identifiers/transitions, preserve required history, and produce the expected audit record.
- Use `profiles.role` as the sole account-level source (`platform_admin | user`).
- Use `organization_memberships.role` as the organization-level source (`org_admin | editor | viewer`) and evaluate membership status separately.
- Use explicit survey/farm grants for resource exceptions. Individual farmers are represented through people/client mappings and grants, not fabricated organizations.
- `profiles.account_role` and `profiles.organization_id` are removed locally and in staging. Do not reintroduce either as compatibility or default-selection state.
- Derive UI defaults from accessible memberships/grants at read time; do not add `default_organization_id` in the current scope.
- Keep normal accounts limited to one live organization membership for the workshop release; general multi-organization workflows are deferred.
- Preserve RLS and server-side checks as authorization boundaries. UI filtering is presentation only.
- Keep service-role credentials local/admin-only and outside browser/runtime/deployment code.
- Keep workshop deployment limited to approved invited datasets and protected public-internet delivery through Cloudflare, NGINX, Supabase, and the approved asset origin.
- Preserve legacy survey/client and asset-path compatibility where required, but never treat those relationships as profile authorization.
- Defer Auth-user invitations, platform-admin role changes, true impersonation, hard deletion, broad asset/infrastructure administration, and full-history migration.

## Superseded Decisions

- The earlier decision to place the final admin experience under the ordinary dashboard route/layout is superseded by the dedicated `/admin` route tree. The single-application decision remains in force.
- The earlier compatibility decision to preserve authorization through `profiles.organization_id` is complete and superseded; memberships and grants are now authoritative.
- The earlier plan to remove `profiles.account_role` only after future dependency gates is complete; the column has been dropped.
- Earlier ordinary `member` workflow terminology is superseded by `viewer`, `editor`, and `org_admin` membership roles.
- The earlier statement that the Admin MVP should remain permanently mostly read-only is superseded. Mutations may expand incrementally only with the approved authorization and audit boundaries.

Use compressed project state first for Codex context and retrieve deeper documentation progressively through `.project_state/project_index.md`.
