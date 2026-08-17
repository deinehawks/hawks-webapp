# Session Handoff

Last updated: 2026-08-17

The first dedicated Users & Access vertical slice is implemented locally. `/admin/users` lists existing accounts and summarizes organization/resource access. `/admin/users/[id]` owns the membership and survey-grant workflows previously located on the admin overview and shows farm grants plus compact related audit activity.

New controlled mutations are limited to viewer/editor membership role changes and survey-grant revoke/reactivate transitions. They re-authenticate the actor, require `platform_admin`, preserve records, rely on existing RLS, reject unsupported transitions, and use existing row audit triggers. No code path changes `profiles.role`; account roles remain only `platform_admin | user`, while `org_admin | editor | viewer` belong to memberships.

Validation:

- TypeScript passes.
- Targeted lint passes with no findings; repository-wide lint still fails on the pre-existing `components/maplibre.tsx` ban-ts-comment error.
- Focused domain pgTAP passes 40/40.
- The full pgTAP command remains red because two older fixture files reference removed schema columns.
- Local unauthenticated `/admin/users` redirects to login. The dev server is running at `http://localhost:3002/asimov-hawks`.
- Authenticated visual smoke remains manual because the browser runtime failed to start.

Next task: smoke the account-management workflow with a platform-admin session, then implement read-only effective-access preview. Farm-grant mutation controls follow after preview or as the next bounded mutation slice.

Do not touch unrelated scratch work in `.tmp/`, `issues.txt`, `workflow.txt`, or the user-owned deletion of `improve.txt`.