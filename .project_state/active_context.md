# Active Context

Last updated: 2026-08-17

Current epic: dedicated platform-admin architecture and workshop-safe delivery.

Completed foundations:

1. Protected asset manifest/RPC/auth groundwork and staging smoke baseline.
2. Admin MVP classification, mapping, membership, survey-grant, and audit visibility.
3. Role-model cleanup through `20260812005500`, including removal of `profiles.account_role` and `profiles.organization_id` locally and in staging.
4. Documentation synchronization establishing one current admin architecture and permission model.
5. Dedicated `/admin` shell, legacy redirects, and role-based landing.
6. First Users & Access vertical slice: account list/detail, access diagnosis, viewer/editor membership role/status controls, survey-grant create/revoke/reactivate, and account-related audit summaries.

Approved next implementation sequence:

1. Authenticated smoke the new `/admin/users` workflow as a platform admin and confirm non-platform denial.
2. Add read-only effective-access preview without user-session impersonation.
3. Add audited farm-grant creation/revocation and confirm farm grants do not reveal surveys or outputs.
4. Continue splitting remaining legacy overview resources into dedicated admin routes.
5. Continue approved workshop operations after the access wave is stable.

Key constraints:

- `profiles.role` remains `platform_admin | user`; organization authority belongs only in memberships.
- Keep RLS and authenticated server-side checks fail-closed.
- Do not reintroduce profile-owned organization authorization or service-role runtime access.
- Every admin mutation requires transition validation and audit coverage.
- Production rollout remains a separate approval step.