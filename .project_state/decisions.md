# Decisions

Last updated: 2026-09-23

## Current Decisions

- Keep the platform-admin and user experiences in one Next.js application and deployment, but use separate route trees and layouts.
- `platform_admin` lands on `/admin`; active organization admins and ordinary
  users land on `/dashboard`. Active organization admins reach `/org-admin`
  through a role-aware sidebar dropdown.
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
- Organization-admin sidebar visibility is presentation only. Exactly one
  active org-admin membership in an active organization is required, while
  strict route guards, server checks, and RLS remain authoritative.
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
- Workshop asset preparation is read-only and requires pre-existing staging
  surveys, clients, and confirmed canonical mappings. Until a future Platform
  Admin Dataset Onboarding workflow exists, new workshop metadata uses a
  separately reviewed staging-only batch transaction.
- Workshop asset preparation/publishing uses explicit `organization` and
  `private` scopes. Private scope requires one confirmed primary
  `client_people` mapping, no organization relationship, a null manifest
  organization, and fail-closed protection-level authorization. Never create
  fabricated one-person organizations.
- The current 30-survey migration uses a 13-survey organization split followed
  by a 17-survey private split. Per-wave reports cannot produce partial
  manifest SQL; one combined draft requires complete unique verification for
  all expected surveys.
- The confirmed existing BSBG staging client is an organization client. The
  private onboarding intake must pin its reviewed UUID, change
  `classification_kind` from `unclassified` to
  `organization`, create/map the active BSBG organization with type code
  `cooperative`, and preserve the five-survey organization scope.
- Preserve existing `domain_can_read_survey` behavior for legacy active
  manifest entries labeled organization, including null-organization entries.
  Correct their scope only through a reviewed superseding manifest; strict
  canonical enforcement applies to new private entries.
- No-organization account signup and dashboard client selection remain
  deferred. Private workshop assets stay platform-admin-only until a supported
  account exists and the platform issues explicit null-organization grants.
- Treat survey `id` and `code` as immutable dataset identity, and retain
  `client_id`, `access_code`, and `organization_code` as read-only
  compatibility fields. Platform-admin metadata edits use the narrow audited
  survey RPC; geospatial, output, and asset-routing fields remain outside that
  workflow.
- Restrict generic survey output types to `orthomosaic`, `point_cloud`,
  `object_detection`, and `other`. Normalize unsupported historical values
  to `other` only after preserving the original in
  `metadata.legacy_output_type`; abort rather than choose a winner when
  normalization would conflict with existing metadata or current-output
  uniqueness.
- Model survey history as independently identified surveys connected through
  the same primary `survey_farms` relationship; do not create an artificial
  survey group. The user-facing timeline is ordered by `surveys.flight_date`
  and selecting an entry loads that survey's orthomosaic and 3D point cloud.
  The first release is chronological switching only: no processing-date
  column, historical detection versioning, or side-by-side comparison.
- Keep timeline authorization server-enforced. Ordinary routes expose only
  surveys allowed by the signed-in user's RLS/effective access, while User App
  Preview exposes only the selected user's calculated survey scope rather than
  the platform admin's unrestricted scope.
- Keep the Survey Timeline presentation within the existing shadcn design
  language: flight date is the primary label, the selected survey is explicit,
  output availability is compact but never hidden, and container-responsive
  navigation uses scrollable cards on wide layouts and a Select control on
  narrow layouts. Visual refinements must not alter timeline scope, ordering,
  routes, or viewer-reset behavior.
- Add a separate client-level Survey dates filter to Orthomap after the Survey
  Timeline is integrated. Preserve All dates as the default; filter rasters,
  boundaries, labels, detections, events, and popups through the same
  already-authorized visible survey IDs. Use a desktop date strip and mobile
  Select. Do not reuse the primary-farm route-switching timeline, broaden
  authorization, add a processing-date field, or include comparison/playback
  in the first slice.
- Store MinIO on a dedicated 1 TB decimal dynamic XFS VHDX backed by `D:` while
  retaining 500 GB for the geospatial pipeline plus the larger of 5% of the
  host volume or 20 GiB. Enforce that host reserve independently from MinIO's
  own larger-of-5%-or-20-GiB reserve, including remaining transfer plus 10%.
  Keep automatic container restart disabled and start MinIO only through the
  UUID-, mount-, image-, bind-, health-, and capacity-checking helper. Preserve
  the original ext4 directory as rollback until a separate retention decision.
  Keep both the live container and its machine-local Compose service on restart
  policy `no`; Compose must not silently restore automatic restart on recreate.
- Keep Docker Desktop automatic sign-in startup disabled. Workshop MinIO starts
  only through the elevated npm helper. A cold start must attach and validate
  the exact XFS UUID before MinIO recreation; an idempotent run may accept the
  retained Docker Desktop bind bridge only when that exact UUID is mounted as
  XFS under the Ubuntu bridge, the configured bind source is unchanged, and
  container `/data` reports XFS. Any missing or conflicting proof fails closed.
- Publish MinIO API and console ports only on `127.0.0.1` for the workshop
  host. Deny anonymous bucket listing for `tiles` and `pointclouds`, but retain
  anonymous exact GetObject on the loopback/internal origin because the
  current NGINX proxy performs authorization with `auth_request` and does not
  sign S3 upstream requests. NGINX remains the public authorization boundary;
  moving to fully private buckets requires a separately designed signed S3
  upstream and must not break existing protected asset URLs.
- Treat mapped workshop-source disappearance during scanning as transient only
  for an explicit bounded set of filesystem/network error codes. Retry
  directory reads and file-size reads with visible backoff for approximately
  60 seconds; after that, fail closed. Do not silently skip a directory that
  disappears after source discovery, and do not retry non-transient errors.
- Keep optional manifest backup alias/timestamp fields null for the current
  staging rollout. Recovery uses the checksummed Auth/Public/application
  database backup, immutable manifest history, guarded draft containment, and
  forward supersession. Never fabricate an export timestamp or edit an
  approved/superseded manifest backward.
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
