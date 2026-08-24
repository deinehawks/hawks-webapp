# Decisions

Last updated: 2026-08-24

## Current Decisions

- Keep the platform-admin and user experiences in one Next.js application and deployment, but use separate route trees and layouts.
- `platform_admin` lands on `/admin`; an active `org_admin` lands on
  `/org-admin`; an ordinary `user` lands on `/dashboard`.
- The current `/dashboard/admin/*` nesting is superseded and transitional. Preserve it through redirects during implementation.
- Users & Access for existing accounts is the first admin delivery wave.
- Effective-access preview is read-only. The authenticated actor remains the platform admin; no user-equivalent session, cookie, token, or mutation authority is issued.
- Every admin mutation must authenticate server-side, require platform-admin authority, rely on RLS, validate identifiers/transitions, preserve required history, and produce the expected audit record.
- Use `profiles.role` as the sole account-level source (`platform_admin | user`).
- Use `organization_memberships.role` as the organization-level source with only `org_admin | member` and evaluate membership status separately.
- Active membership opens the organization portal. Ordinary members require explicit farm/survey grants; active org admins receive management visibility over confirmed organization resources.
- Organization-admin writes use narrow audited security-definer RPCs, never broad table-update policies.
- An active org admin may promote an active ordinary member in the same organization. Org admins may not alter their own or any other org-admin membership; demotion, suspension, and removal of org admins remain platform-admin-only.
- The workshop org-admin portal resolves exactly one active org-admin organization membership and fails closed on zero or multiple matches.
- Organization admins have read-only visibility into confirmed survey metadata.
  Survey mutation and every output view/mutation remain platform-admin-only.
- Organization-scoped grants require active membership, an active organization, and a confirmed matching resource relationship. Null-organization grants are platform exceptions.
- Suspension makes organization-scoped grants ineffective. Removal revokes them atomically and retains audit history.
- Users create and confirm their own Auth accounts before review. Platform admins
  approve or reject the resulting request and select organization/initial role;
  pending/rejected profiles remain blocked. Service-role credentials remain
  outside Next.js runtime.
- `profiles.account_role` and `profiles.organization_id` are removed locally and in staging. Do not reintroduce either as compatibility or default-selection state.
- Derive UI defaults from accessible memberships/grants at read time; do not add `default_organization_id` in the current scope.
- Keep normal accounts limited to one live organization membership for the workshop release; general multi-organization workflows are deferred.
- Preserve RLS and server-side checks as authorization boundaries. UI filtering is presentation only.
- Keep service-role credentials local/admin-only and outside browser/runtime/deployment code.
- Keep workshop deployment limited to approved invited datasets and protected public-internet delivery through Cloudflare, NGINX, Supabase, and the approved asset origin.
- Preserve legacy survey/client and asset-path compatibility where required, but never treat those relationships as profile authorization.
- Defer platform-created Auth accounts, automated invitation delivery, platform-admin role changes, true impersonation, hard deletion, broad asset/infrastructure administration, and full-history migration.

## Superseded Decisions

- The earlier decision to place the final admin experience under the ordinary dashboard route/layout is superseded by the dedicated `/admin` route tree. The single-application decision remains in force.
- The earlier compatibility decision to preserve authorization through `profiles.organization_id` is complete and superseded; memberships and grants are now authoritative.
- The earlier plan to remove `profiles.account_role` only after future dependency gates is complete; the column has been dropped.
- The viewer/editor/org-admin organization-role model is superseded by `org_admin | member`. Legacy viewer/editor rows convert to member.
- The earlier statement that the Admin MVP should remain permanently mostly read-only is superseded. Mutations may expand incrementally only with the approved authorization and audit boundaries.
- The earlier rule reserving all org-admin promotion to platform admins is superseded only for promotion of an active ordinary member by an active org admin in the same organization. Existing org-admin management remains platform-admin-only.
- The earlier org-admin scope allowing survey/output metadata editing is
  superseded. Organization admins may view confirmed surveys but cannot mutate
  survey metadata or access the Outputs management surface.

Use compressed project state first for Codex context and retrieve deeper documentation progressively through `.project_state/project_index.md`.
