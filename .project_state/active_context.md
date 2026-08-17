# Active Context

Last updated: 2026-08-17

Current epic: dedicated platform-admin architecture and workshop-safe delivery.

Completed foundations:

1. Protected asset manifest/RPC/auth groundwork and staging smoke baseline.
2. Admin MVP classification, mapping, membership, survey-grant, and audit visibility.
3. Role-model cleanup through `20260812005500`, including removal of `profiles.account_role` and `profiles.organization_id` locally and in staging.
4. Documentation synchronization establishing one current admin architecture and permission model.
5. Dedicated `/admin` shell, legacy redirects, and role-based landing.
6. Users & Access vertical slice: account list/detail, access diagnosis, viewer/editor membership role/status controls, survey/farm-grant create/revoke/reactivate, read-only effective-access preview, repaired pgTAP coverage, and account-related audit summaries.
7. Read-only `/admin/[resource]` list route for clients, organizations, people, farms, surveys, memberships, and outputs.
8. Organization Operations v1: create/edit canonical organizations, active/inactive status transitions, membership roster, and add existing users as viewer/editor members.
9. Farm Operations v1: create/edit canonical farms, active/inactive status transitions, confirmed organization links, and read-only survey relationship visibility.
10. Survey Operations v1: edit workshop-safe survey metadata/status, link active farms/organizations, and inspect output readiness.
11. Output Operations v1: register draft output records, edit safe metadata, enforce readiness transitions/storage gates, atomically select the current eligible output, and use clearer admin survey selector labels.

Approved next implementation sequence:

1. Smoke `/admin/access-preview/[profileId]` plus farm-grant create/revoke/reactivate in a platform-admin session and confirm normal-user denial remains intact.
2. Smoke new `/admin/[resource]` list routes and existing detail links.
3. Smoke Organization Operations v1 in a platform-admin session: create org, edit metadata, toggle status, add existing user membership, and confirm normal-user denial.
4. Smoke Farm Operations v1 in a platform-admin session: create farm, edit metadata, toggle status, link active organization, and confirm normal-user denial.
5. Smoke Survey Operations v1 in a platform-admin session: edit survey metadata/status, link active farm, link active organization, and inspect outputs.
6. Smoke Output Operations v1 as platform admin and confirm normal-user denial.
7. Continue approved workshop asset migration/readiness work after output smoke passes.
8. Keep output publication, enum rebuild, Auth invitations, platform-admin promotion, destructive workflows, and true impersonation deferred.

Key constraints:

- `profiles.role` remains `platform_admin | user`; organization authority belongs only in memberships.
- Keep RLS and authenticated server-side checks fail-closed.
- Do not reintroduce profile-owned organization authorization or service-role runtime access.
- Every admin mutation requires transition validation and audit coverage.
- Production rollout remains a separate approval step.