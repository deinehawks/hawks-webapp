# Current State

Last updated: 2026-08-17

Current branch observed by Codex: `feature/workshop-manifest-gate`.

Compressed startup workflow is active through `AGENTS.override.md` and `.project_state/`.

Protected asset baseline remains in place: authenticated NGINX delivery, protected tile/point-cloud routes, workshop manifest gating, and the publisher/report flow are implemented and user-smoke-confirmed for staging control samples.

Dedicated admin status:

- `/admin` has a dedicated layout, navigation, server-side platform-admin guard, and role-based landing.
- Legacy `/dashboard/admin/*` routes redirect to `/admin/*`.
- `/admin/users` lists existing accounts with concise membership/grant access status.
- `/admin/users/[id]` shows account context, membership history, survey/farm grants, and related audit summaries.
- Platform admins can create viewer/editor memberships, update ordinary membership status/role, create survey/farm grants, and revoke/reactivate survey/farm grants through authenticated RLS-bound audited actions.
- `/admin/access-preview/[profileId]` provides read-only effective-access calculation from active memberships and grants without impersonation.
- `/admin/[resource]` provides read-only list routes for clients, organizations, people, farms, surveys, memberships, and outputs, linked from the admin sidebar where currently prioritized.
- `/admin/organizations/new` and `/admin/organizations/[id]` provide Organization Operations v1: create canonical organizations, edit organization metadata, toggle active/inactive status, inspect membership roster, and add existing users as viewer/editor members.
- `/admin/farms/new` and `/admin/farms/[id]` provide Farm Operations v1: create canonical farms, edit farm metadata, toggle active/inactive status, inspect organization/survey relationships, and link active organizations as confirmed farm relationships.
- `/admin/surveys/[id]` provides Survey Operations v1: edit workshop-safe survey metadata/status, link active farms, link active organizations, and inspect output readiness without mutating asset paths.
- `/admin/outputs/new` and `/admin/outputs/[id]` provide Output Operations v1: register draft output records, edit safe catalog metadata, attach existing storage references, manage readiness through approved transitions, and atomically select the current ready/approved output. Upload, relocation, deletion, and publishing remain outside this workflow. Survey pickers show short survey ID plus code/context instead of duplicate client-code labels.
- `profiles.role` is not mutable in this workflow and remains account-level `platform_admin | user` only.
- Auth invitations, platform-admin role changes, true impersonation, organization-admin promotion, deletion, and broad infrastructure controls remain deferred.

Role/permission state:

- `profiles.role` is the sole account-level source.
- `organization_memberships.role` uses `org_admin | editor | viewer`; membership status is evaluated separately.
- Survey/farm grants are resource exceptions.
- `profiles.account_role` and `profiles.organization_id` are removed locally and in staging.
- Historical `app_role` enum labels remain blocked by a check constraint pending a separate enum rebuild.

Validation for the current admin wave:

- `npx tsc --noEmit --incremental false`: pass.
- Targeted lint for changed admin access/resource files: pass with no warnings or errors.
- Full pgTAP suite: pass, 91 tests across 5 files.
- User smoke confirmed platform-admin access and normal-user denial for `/admin`.
- Authenticated visual smoke for new preview/farm controls remains manual.