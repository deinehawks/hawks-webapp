# Active Context

Last updated: 2026-08-13

Current epic: dedicated platform-admin architecture and workshop-safe delivery.

Completed foundations:

1. Protected asset manifest/RPC/auth groundwork and staging smoke baseline.
2. Admin MVP classification, mapping, membership, survey-grant, and audit visibility.
3. Role-model cleanup through `20260812005500`, including removal of `profiles.account_role` and `profiles.organization_id` locally and in staging.
4. Documentation synchronization establishing one current admin architecture and permission model.
5. Dedicated `/admin` shell, legacy `/dashboard/admin/*` redirects, and role-based landing for root/login/OTP flows.

Approved next implementation sequence:

1. Build dedicated Users & Access routes for existing profiles, memberships, grants, and access diagnosis inside `/admin`.
2. Add read-only effective-access preview without user-session impersonation.
3. Split the legacy admin overview into dedicated resource routes and move controls to the most relevant surfaces.
4. Continue approved domain/workshop operations after the access wave is stable.

Key constraints:

- Keep RLS and authenticated server-side checks fail-closed.
- Do not reintroduce profile-owned organization authorization.
- Do not use service-role credentials in app/runtime code.
- Every admin mutation requires transition validation and audit coverage.
- Production rollout remains a separate approval step.
