# Admin Dashboard Phase 2 Discovery

Status: read-only discovery on `phase/domain-discovery`
Date: 2026-07-28
Scope: repository, connected staging Supabase metadata, and intern dashboard code inventory only

> Historical snapshot: this document preserves Phase 2 evidence and is not a
> current implementation plan. The authoritative admin direction is
> docs/admin-dashboard-integration-plan.md; current role and permission facts
> are in docs/role-permission-model-and-migration-plan.md.

No application code, migrations, remote data, storage objects, dependencies, commits, pushes, or deployments are changed by this document.

## 1. Evidence Snapshot

### Main application repository

- The main app has no `/admin` route yet. Current protected user routes are under `app/dashboard/`, including `app/dashboard/page.tsx`, `app/dashboard/surveys/[surveyId]/page.tsx`, and `app/dashboard/orthomap/[plantation]/page.tsx`.
- Tenant access in server code is still centered on one profile organization/client. `lib/auth/user-context.ts` loads `profiles` with `clients!profiles_organization_id_fkey`, and `requireAccessibleClientById()` denies non-platform users when `profile.organization_id` does not match the requested client.
- Survey list/detail reads use `surveys.client_id` and join current outputs through `orthos!orthos_survey_id_fkey` and `point_clouds!point_clouds_survey_id_fkey` in `lib/actions/surveys.ts`.
- Detection reads use the `detected-objects` bucket with `<client-uuid>/detections.json` and a temporary `<client-code>.json` fallback in `getObjectDetectionData()`.
- Shared types in `lib/types.ts` expose the current compatibility model: `UserProfile` omits legacy `access_code`/`organization`, and `Survey` omits legacy `access_code`/`code`/`organization_code` plus legacy output pointer columns.
- Checked-in migration files currently cover the legacy baseline and UUID hardening only: `supabase/migrations/20260727000000_legacy_baseline.sql`, `20260727001000_expand_uuid_tenant_keys.sql`, `20260727002000_harden_uuid_authorization.sql`, and `20260727003000_drop_duplicate_surveys_id_key.sql`.
- Current RLS helper functions in `supabase/migrations/20260727002000_harden_uuid_authorization.sql` still use `profiles.role` plus `profiles.organization_id`; there is not yet a canonical people/organizations/farms/memberships/grants authorization model.
- Existing authorization tests in `supabase/tests/authorization.sql` cover the old `platform_admin`, `org_admin`, `editor`, and `viewer` matrix, not the approved future `platform_admin`/`individual` plus organization membership model.

### Connected staging Supabase metadata

Read-only Supabase MCP inspection found:

- Recorded migrations: `20260727000000_legacy_baseline`, `20260727001000_expand_uuid_tenant_keys`, `20260727002000_harden_uuid_authorization`, and `20260727003000_drop_duplicate_surveys_id_key`.
- No Edge Functions are currently deployed.
- Public domain tables currently visible are `clients`, `profiles`, `surveys`, `orthos`, and `point_clouds`.
- `public.surveys` has 107 rows and includes `client_id`, legacy code columns, status, `created_by`, boundaries, tile bounds, and legacy output pointers.
- `public.clients` still has primary key `code` plus additive UUID `id`; it has no classification/type column.
- `public.profiles` still has `role` enum values `platform_admin`, `org_admin`, `editor`, and `viewer`, plus one nullable `organization_id`.
- `storage.objects` RLS is enabled, but the MCP table summary does not prove bucket policy correctness.
- Security advisor currently reports leaked-password protection disabled.
- Performance advisor reports unindexed legacy/code foreign keys and one unused `profiles_organization_id_idx`; these are not Phase 2 changes.

### Intern dashboard repository

Source: private GitHub repository `deinehawks/hawks-intern-admin-dashboard`, default branch `main`, inspected through the GitHub connector and a temporary shallow clone.

- Framework/dependencies: Next.js `16.1.7`, React `19.2.3`, Tailwind CSS 4, shadcn/Radix-style UI, Supabase SSR, React Hook Form, Zod, Zustand, and Recharts in `package.json`.
- Implemented portal routes include `app/(portal)/dashboard`, `organizations`, `members`, `missions`, `image-outputs`, `model-outputs`, `settings`, and `profile`.
- The intern database types in `types/database.types.ts` use demo tables: `organizations_demo`, `members_demo`, `missions_demo`, `image_outputs_demo`, and `model_outputs_demo`.
- Intern role helpers call exposed RPCs such as `get_my_role`, `get_my_organization_id`, `is_admin`, and `is_editor_or_admin`.
- Intern roles are `admin`, `editor`, and `viewer`; they do not match the approved role split for this app.
- Intern middleware-like logic in `lib/supabase/proxy.ts` gates routes by client-side path lists and RPC role checks. It is useful as a UI/navigation pattern, not as an authorization contract.
- Intern CRUD actions directly mutate demo tables and include destructive deletes in organizations, missions, image outputs, and model outputs. These must not be copied into the main app before RLS, audit, and domain tables are approved.

## 2. Feature Classification

| Intern feature | Initial decision | Reason |
|---|---|---|
| Portal layout/sidebar/profile shell | Adapt | Useful admin UX structure, but routes and auth must be nested into the main app and use existing session handling. |
| Dashboard summary cards/charts/recent missions | Adapt | Good MVP read-only admin overview pattern; data must come from `clients`, `profiles`, `surveys`, `orthos`, and `point_clouds` first. |
| Organizations page | Rebuild data layer, adapt UI | Intern table is `organizations_demo`; main app has mixed `clients` and no canonical `organizations` yet. |
| Members page | Rebuild data layer, adapt selected UI | Intern `members_demo` conflates profile/contact/membership; main model must separate profiles, people, and organization memberships. |
| Missions page | Rebuild around current `surveys` first | Intern `missions_demo.organization_id` cannot represent multi-farm surveys or existing map workflows. |
| Image outputs page | Adapt concept only | Intern `image_outputs_demo` overlaps partially with `orthos`; main app already has `orthos.survey_id`. |
| Model outputs page | Adapt concept only | Intern `model_outputs_demo` overlaps partially with `point_clouds`; generic `survey_outputs` is future schema work. |
| Settings/profile pages | Adapt carefully | Profile update patterns are useful, but role/org changes require protected server/RLS checks. |
| Role context and path gating | Drop as authority, adapt for display | Main app must use RLS and server-side checks; client/UI role context can only hide or show controls. |
| Demo Supabase types and queries | Drop | They point to `*_demo` tables and exposed RPCs that are not canonical. |
| Destructive delete flows | Defer | First release should avoid destructive deletion until audit/retention/rollback rules are approved. |

## 3. Main Gaps Before Implementation

Critical gaps before schema/RLS implementation:

- No canonical `people`, `organizations`, `farms`, `organization_memberships`, `survey_farms`, `survey_organizations`, `farm_access_grants`, `survey_access_grants`, `survey_outputs`, or audit tables exist.
- `profiles.role` still carries app-wide `platform_admin`, `org_admin`, `editor`, and `viewer`; the approved split between global account role and organization membership role is not implemented.
- Existing RLS helpers only understand one `profiles.organization_id`; they cannot yet authorize multi-farm surveys or explicit survey grants.
- `detected-objects` is still compatible with organization-level JSON, which is too broad for narrow survey grants.
- Local `public/tiles` and `public/3d` files cannot be protected by Postgres RLS.

Important gaps before Admin Dashboard integration:

- No admin route shell or fail-closed admin layout exists.
- No read-only admin server actions exist for platform overview, client classification review, membership review, farms, or outputs.
- No audit foundation exists for admin mutations.
- No agreed safe Auth-user provisioning path exists.
- No CI/test baseline protects future admin work.

Future improvements:

- Replace legacy `viewer`/`editor` compatibility with approved account and membership roles after the expand phase.
- Introduce protected survey-scoped detection/object delivery.
- Move large tiles and point clouds to the approved asset pipeline.
- Add richer output/report lifecycle only after publication/retention decisions are made.

## 4. Recommended Phase 3 Candidate

Start with an additive local-only schema design package, not UI:

Goal:

- Draft, but do not apply remotely, the smallest additive domain migration and verification SQL needed for canonical people, organizations, farms, memberships, multi-farm surveys, explicit grants, basic outputs, and audit foundations.

Likely files:

- `supabase/migrations/<timestamp>_expand_domain_foundation.sql`
- `supabase/verification/verify_domain_expand.sql`
- `supabase/tests/domain_authorization.sql`
- `lib/database.types.ts` only if types are regenerated from an approved local schema
- Planning docs only if decisions change during review

Non-goals:

- No remote staging/production migration.
- No Auth-user creation.
- No destructive deletes.
- No storage policy finalization.
- No admin UI mutations.

Acceptance criteria:

- Migration is additive and backward compatible.
- Existing `clients`, `profiles.organization_id`, `profiles.role`, `surveys.client_id`, routes, maps, outputs, and storage paths keep working.
- Legacy `clients` can remain unclassified.
- Normal non-platform accounts cannot have more than one live organization membership.
- Survey-to-farm relationship is many-to-many through `survey_farms`.
- Farm owner/operator/contact metadata grants no application access.
- Farm grants do not expose shared surveys; survey grants are separate.
- Every new privileged table has planned RLS, indexes, and audit behavior.

## 5. Parallel Phase 3 UI Candidate

Only after the local schema design is reviewed, the first UI slice should be read-only:

Goal:

- Add a protected `/admin` shell and read-only overview using existing tables only.

Likely files:

- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `components/admin/*`
- `lib/actions/admin/*`
- `lib/auth/user-context.ts` or a new server-only authz helper

Constraints:

- Use `platform_admin` only for the first admin shell.
- Keep `org_admin` member management out until the membership schema exists.
- Do not import intern actions or demo table queries.
- Adapt only simple UI patterns from the intern dashboard.

## 6. Open Questions Blocking Real Implementation

1. Should Phase 3 prioritize the additive domain migration package first, or the platform-admin-only read-only `/admin` shell first?
2. Do we have an approved list or spreadsheet for classifying current mixed `clients` rows, or should the app include a review UI later?
3. Should organization types be a Postgres enum in v1 or a lookup table to allow future additions without enum migrations?
4. Should `people` be allowed to link to multiple organizations as non-authorizing domain metadata in v1, even though normal login accounts get only one live access membership?
5. What minimal audit event fields are required for the September MVP?
6. Is Auth-user provisioning definitely deferred to manual/Supabase Dashboard operations for the September release?

## 7. Recommended Next Step

Proceed with Phase 3A: additive domain migration package in local files only.

Reason:

- The admin UI depends on domain and RLS contracts. Drafting the local migration package first lets us review table names, constraints, indexes, RLS helpers, verification SQL, and rollback notes before any remote change or UI work.

Suggested branch:

- Continue on `phase/domain-discovery` until this discovery doc is reviewed.
- Then branch from `development` into `phase/domain-schema` for Phase 3A after approval.

Suggested validation for this discovery phase:

```powershell
git status --short
git diff --check
git diff -- docs/admin-dashboard-phase-2-discovery.md
rg -n "organizations_demo|members_demo|missions_demo|survey_farms|explicit.*grant|September|platform_admin|individual" docs/admin-dashboard-phase-2-discovery.md
```
