# Supabase UUID Tenant and Domain Migration Runbook

Last updated: 2026-08-24
Status: Authoritative database rollout runbook

Target staging project: `llealjcaqvltrtdwwzrh`

This runbook records the existing additive UUID migration, the additive Phase 3A
domain foundation, and the gates required before any classification, membership,
contract, storage, or asset-delivery change. Repository files do not prove
current staging or production state.
Contract cleanup, storage finalization, and deletion of legacy objects require
separate approval.

The additive Phase 3F-3I work, the 2026-08-12 role cleanup, Output Operations
(`20260817000000`), and Access Policy v2 (`20260818000000`) are completed in
local and staging environments. Production has not received Access Policy v2.
`profiles.account_role` and `profiles.organization_id` are removed;
`profiles.role` is constrained to `platform_admin | user`; organization
membership uses `org_admin | member`; ordinary members require explicit grants
for resources. The original sequence remains documented as rollout history.
Current admin architecture and delivery order are owned by
`docs/admin-dashboard-integration-plan.md`.

## Required inputs

- A verified restorable staging backup or a database password for `pg_dump`.
- `SUPABASE_ACCESS_TOKEN` for CLI linking.
- `SUPABASE_DB_PASSWORD` for database dump and migration operations.
- `BOOTSTRAP_PLATFORM_ADMIN_USER_ID`, containing one confirmed `auth.users.id`.
- Existing application environment variables. Never print or commit values.
- A reviewed mapping register that classifies each mixed legacy `clients` row
  as organization, individual, or unclassified without changing the row.
- Approved single-organization membership, multi-farm survey, explicit farm and
  survey grant, and platform-only organization-admin promotion rules.
- Current role-source-of-truth model from `docs/role-permission-model-and-migration-plan.md` for every authorization or admin change.
- Separate approval for Auth provisioning, output/report lifecycle, audit
  retention, invitation delivery, and protected asset delivery before those
  capabilities are implemented.
- An approved workshop manifest listing only invited accounts, organizations,
  surveys, maps, tiles, point clouds, detections, outputs, and required metadata.
  Do not place secrets or unnecessary personal data in the checked-in manifest.

## Domain approval gate

Before drafting domain SQL, confirm and record:

1. Existing `clients` rows are mixed historical tenants. Preserve them and map
   reviewed rows separately to canonical people or organizations; unresolved
   records remain `unclassified`.
2. `profiles` remains the application-account table. Existing rows may be
   organization-level accounts; future people may have no login.
3. Account-level role belongs in `profiles.role` only, with target values
   `platform_admin` and `user`; organization-level role belongs in
   `organization_memberships.role`, with target values `org_admin` and `member`.
4. Normal accounts have at most one live organization membership in v1.
5. Farms/plantation areas are separate from people and organizations, and their
   owner/operator/contact metadata does not grant access.
6. Surveys remain the mission records and relate to multiple farms through
   `survey_farms`, not one canonical `surveys.farm_id`.
7. Membership alone grants no farm/survey/output access to ordinary members. A
   farm grant exposes only the farm record; a separate survey grant exposes its
   survey and outputs.
8. Every new output/report record traces to a survey; existing `orthos` and
   `point_clouds` continue using `survey_id`.

Do not apply `supabase/deferred/contract_uuid_tenant_keys.sql` or
`supabase/deferred/secure_detected_objects_storage.sql` while any blocking
domain or authorization decision remains unresolved.

## Completed role cleanup and current pre-contract gate

The role cleanup was applied through migrations `20260812000000` to
`20260812005500`. Its historical order was: remove active `account_role`
dependence; expand and backfill membership roles; normalize profile roles; cut
authorization to memberships/grants; remove the legacy profile-organization
fallback; drop both legacy profile columns; regenerate types; and constrain
`profiles.role` to `platform_admin | user`.

Current contract work must preserve these post-removal invariants:

- no live policy, helper, action, test, verification query, or generated type
  depends on either removed profile column;
- organization access comes from active memberships and explicit grants;
- protected asset and application reads use the same access model;
- `surveys.client_id` and legacy asset paths remain compatibility relationships,
  not profile-owned authorization;
- the deferred `app_role` enum rebuild remains a separate reviewed migration.

## Access Policy v2 local validation and staging gate

`20260818000000_access_policy_v2.sql` is a targeted authorization cleanup. It:

- contracts `membership_role` to `org_admin | member`, mapping legacy
  `viewer`/`editor` rows to `member`;
- adds nullable `organization_id` to farm/survey grants;
- requires active membership, active organization, and confirmed resource
  relationship for organization-scoped grants;
- revokes scoped grants when membership becomes `removed`;
- removes legacy permissive survey/ortho/point-cloud policies;
- adds approved-signup and organization-onboarding-request tables/functions;
- keeps direct Auth-account creation out of the Next.js runtime.

Before staging apply:

1. Run `supabase/verification/inventory_access_policy_v2.sql` read-only and save
   its output outside Git when it contains account emails or operational data.
2. Capture and test a restorable staging backup.
3. Review the schema/policy diff and confirm the target project.
4. Confirm all legacy `viewer`/`editor` memberships are intended to become
   `member`.
5. Confirm organization-scoped grants have confirmed matching relationships.
6. Rehearse clean apply and `supabase/tests/access_policy_v2.sql` locally.
7. Keep `supabase/rollback/20260818000000_access_policy_v2.sql` with the operator
   package. It is a containment rollback for an unused/non-production rollout;
   after accounts claim approvals or scoped grants are used, restore the tested
   backup instead of guessing historical roles.

After staging apply, regenerate types through the approved generator, run the
full pgTAP suite, and smoke platform admin, org admin, member, suspended member,
removed member, platform exception, approved signup, rejected signup, and
anonymous/cross-organization sessions. Production remains separately approved.

### 2026-08-18 staging rollout record

- Linked target confirmed as `llealjcaqvltrtdwwzrh`.
- The ordered dry-run contained only Output Operations
  (`20260817000000`) and Access Policy v2 (`20260818000000`).
- Pre-change schema, public/auth data, and Auth schema snapshots were stored
  outside Git under the operator's local temporary backup directory. SHA-256
  checks completed successfully.
- Restore rehearsal passed in an isolated local database. Restore Auth schema
  first while deferring `on_auth_user_created`, restore Public schema (which
  recreates that trigger), restore the separate Auth data once, then stream only
  `public.*` statements from the combined data snapshot with triggers disabled
  for the dump's documented circular foreign keys.
- Affected inventory: four memberships (`1 org_admin`, `1 editor`, `2 viewer`),
  two active survey grants, no farm grants, and one archived orthomosaic output.
- Post-apply inventory: `1 org_admin`, `3 member`, zero viewer/editor rows, and
  both survey grants organization-scoped. Required signup, onboarding,
  authorization, protected-asset, and output-readiness objects are present.
- Linked migration history and a second dry-run confirm staging is current.
- Linked database types were regenerated and TypeScript passed.
- Database lint retains only the pre-existing stale
  `app_private.backfill_legacy_organization_memberships` error.
- The full user-assisted authenticated role/session matrix passed on
  2026-08-20. Production rollout remains prohibited pending separate approval.

### User-first signup corrective migration

`20260818001000_user_first_signup_requests.sql` supersedes the pre-approved
email workflow after product clarification. It was applied to staging on
2026-08-19 after inventory and tested backup gates. Production is unchanged.

- Existing profiles become `active`; new non-seed Auth users become `pending`.
- New users create and confirm their own account before review.
- `account_signup_requests` is self-readable and platform-admin-readable only.
- Approval atomically selects organization/role, creates membership, activates
  the profile, and closes the request. Rejection blocks application access.
- Existing open pre-approvals are revoked and the legacy claim RPC is no longer
  executable by authenticated users.
- Before applying, run
  `supabase/verification/inventory_user_first_signup_requests.sql`, capture and
  restore-test a fresh staging backup, review open legacy approvals, and verify
  the dry-run contains only `20260818001000`.
- After applying, smoke unconfirmed signup, confirmed pending access, admin
  queue visibility, member/org-admin approval, rejection, repeated review denial,
  anonymous denial, and cross-organization/resource denial.
- Before interactive signup smoke, allowlist the exact callback URL in Supabase
  Authentication URL Configuration. Local development uses
  http://localhost:3000/asimov-hawks/auth/confirm; deployments use the same
  base-path callback on their HTTPS origin. The application explicitly supplies
  this redirect and supports both PKCE code and token-hash callbacks.

The 2026-08-19 staging inventory found 23 Auth users, 23 profiles, and one
already-revoked legacy approval. A full schema plus Auth/Public data recovery
rehearsal restored matching counts. Migration history and a no-pending dry-run
passed; post-migration types contain the request table, account status, and both
review RPCs. Interactive signup smoke found and corrected a missing base-path
callback plus PKCE-code handling on 2026-08-20. A fresh single-use confirmation
link, pending review, approval, membership assignment, and activated login smoke
passed.

## Organization Admin portal migration

`20260820000000_org_admin_portal.sql` and corrective migration
`20260824000000_restrict_org_admin_survey_output.sql` were applied to staging
on 2026-08-24. Together they replace
broad organization-admin membership/onboarding mutation paths with narrow
audited RPCs for approved farm, grant, member, organization-profile, and
onboarding-request operations. Surveys are read-only and Outputs remain
platform-admin-only; the corrective migration removes both org-admin mutation
RPCs from the public contract.

Local evidence:

- clean database replay passed;
- the combined pgTAP suite passed 142/142 across eight files;
- generated database types include all org-admin RPC contracts.
- the protected portal, server actions, TypeScript, targeted ESLint, and
  whitespace checks pass locally.

### 2026-08-24 staging rollout record

- Linked target was confirmed as `llealjcaqvltrtdwwzrh`; the dry-run contained
  only the two org-admin migrations.
- Pre-apply inventory found one valid active org admin, no multi-organization
  org-admin ambiguity, no invalid organization-scoped grants, and the expected
  legacy onboarding insert/update policies.
- Fresh application/private schema, Auth schema, and Auth/Public data backups
  were stored outside Git in the operator's temporary backup directory and
  SHA-256 checksummed.
- Recovery rehearsal passed against an isolated local database. The Auth
  trigger was deferred until Auth and application schemas existed; the local
  `extensions`, `vault`, `app_private`, and `supabase_realtime` bootstrap
  objects were created before restore. Restored counts matched staging for all
  compared Auth and domain tables.
- Exact migration replay and the guarded non-destructive containment script
  passed against the restored clone. Inventory and containment artifacts are
  `supabase/verification/inventory_org_admin_portal.sql` and
  `supabase/rollback/20260820000000_org_admin_portal.sql`.
- Both migrations applied successfully. Linked history and a second dry-run
  show no pending migrations. Post-apply verification found the 11 approved
  org-admin RPCs, both grant-read policies, and both audit triggers; survey and
  output mutation RPCs are absent.
- Linked types were regenerated. TypeScript and targeted ESLint passed, and the
  full local pgTAP suite passed 142/142. Linked DB lint reports only the known
  stale `app_private.backfill_legacy_organization_memberships` error.
- The CLI completed the database push but its optional pg-delta catalog cache
  step warned about a missing temporary CA file. Independent history,
  inventory, permissions, and no-pending checks passed afterward.

The authenticated post-rollout org-admin UI smoke passed on 2026-08-24 for
onboarding submission/cancellation, member and grant lifecycles, read-only
survey visibility, absent Outputs, and prohibited role/scope boundaries.
Production remains unchanged and must not receive these migrations as part of
validation.

### Platform onboarding review corrective migration

`20260824001000_admin_onboarding_request_review.sql` was applied to staging on
2026-08-24. It adds the
missing `/admin/onboarding-requests` review contract: platform admins may
approve or reject pending organization requests through narrow audited RPCs,
while direct authenticated table mutation is revoked. Approval records intent
and review metadata only; recipients still use user-first signup and the
separate Signup Approvals queue.

The single-migration non-production gate passed against
`llealjcaqvltrtdwwzrh`:

- Inventory found two cancelled requests, no duplicate pending email, no
  pending request for an inactive organization, and the expected pre-migration
  broad platform-admin mutation policy.
- Fresh schema, Auth schema, and Auth/Public data backups were stored outside
  Git and SHA-256 checksummed. An isolated restore matched staging counts for
  24 Auth users, 24 profiles, 3 organizations, 5 memberships, 2 onboarding
  requests, 142 audit rows, 3 farms, 108 surveys, and 1 output.
- Exact migration and containment replay passed on the restored clone. The
  linked dry-run contained only `20260824001000` before apply and no migrations
  afterward.
- Independent post-apply verification confirmed `review_notes`, both review
  RPCs, read-only platform/org-admin policies, no direct authenticated table
  mutations, and preserved request data. Linked types were regenerated.
- TypeScript, targeted ESLint, whitespace checks, and full local pgTAP (153/153)
  pass. Linked DB lint reports only the known stale legacy membership-backfill
  function. The optional pg-delta cache step emitted its known missing temporary
  CA-file warning after push; independent history and contract checks passed.

User-assisted authenticated staging smoke passed on 2026-08-24 for
organization-admin onboarding submission and platform-admin queue review. The
org-admin/onboarding review staging gate is closed. Production remains
unchanged.

### Survey update contract

`20260825000000_contract_survey_updates.sql` is implemented and validated
locally. It preserves survey identity, client compatibility, canonical
relationships, and every asset path while restricting platform-admin metadata
updates to `platform_admin_update_survey`. Direct `authenticated` updates to
`public.surveys` are revoked; operational service-role workflows remain
separate.

Before staging:

1. Run `supabase/verification/inventory_survey_contract.sql` in a read-only
   transaction and retain only its aggregate output.
2. Capture checksummed schema/Auth/Public backups outside Git and prove an
   isolated restore.
3. Replay the migration and
   `supabase/rollback/20260825000000_contract_survey_updates.sql` containment
   script against the restored clone.
4. Confirm the linked dry-run contains only `20260825000000`, then apply to
   non-production staging.
5. Verify table privileges, RPC permissions, audit records, linked types, full
   pgTAP, TypeScript, targeted ESLint, and authenticated platform-admin and
   denied ordinary-user behavior.

The local gate passes clean replay, focused pgTAP 8/8, full pgTAP 161/161,
TypeScript, targeted ESLint, and whitespace validation. Local DB lint reports
only the known stale legacy membership-backfill function.

The aggregate read-only staging inventory passed on 2026-08-25: 108 surveys,
complete client references, aligned legacy codes, no output-pointer mismatches,
107 null organization codes, and nine duplicated non-null survey-code groups.
The latter two findings confirm those compatibility fields must remain
nullable/non-unique and immutable in this stage.

The staging database gate completed on 2026-08-25: checksummed schema/Auth/
Public backups, exact-count isolated restore, migration/containment/reapply,
one-file dry-run, apply, history/no-pending verification, linked types, full
161/161 pgTAP, TypeScript, targeted ESLint, and rolled-back database-role
authorization smoke all passed. Linked DB lint reports only the known stale
legacy backfill function. The matching application code is integrated into
`development`; deployment confirmation and a signed-in UI click-through
remain. Detailed evidence is in
`docs/survey-contract-staging-validation-2026-08-25.md`. Production is
unchanged.

## Delivery gates

- Limited public-internet workshop deployment target: September 28-30, 2026.
- Stabilization, documentation, and handoff: October 1-9, 2026.
- Final completion deadline: October 9, 2026.
- Initial rollout: internal/platform administrators, followed by one known
  cooperative or organization, then the approved invited workshop cohort.
- Rollback authority: technical owner/project lead.
- Infrastructure gate: Dockerized Next.js, NGINX, Cloudflare DNS/HTTPS/proxying
  and basic protection, Supabase, and an approved protected asset origin.
- Data-scope gate: migrate only manifest-listed workshop records and assets.
  Full historical and non-invited client migration remains deferred.

Reduce MVP scope before reducing RLS, compatibility, audit, verification,
backup, recovery, or rollback requirements.

## Establish the baseline

1. Confirm the project URL resolves to the staging reference above.
2. Capture both backups before any remote migration:

   ```powershell
   npx supabase link --project-ref llealjcaqvltrtdwwzrh
   npx supabase db dump --linked --schema-only --file backups/staging-schema.sql
   npx supabase db dump --linked --data-only --use-copy --file backups/staging-data.sql
   ```

3. Store backups outside Git and test restoration against an isolated database.
4. Mark the reconstructed baseline as applied on staging:

   ```powershell
   npx supabase migration repair 20260727000000 --status applied --linked
   ```

5. Use `npx supabase db push --dry-run --linked` and confirm that only the two
   additive migrations are pending.

The checked-in baseline is intended for new local databases. It must not be
executed against the existing staging project.

## Domain preflight

Run these checks read-only against the confirmed non-production target and
save the results with the migration review. Do not infer classifications from
codes or names alone.

```sql
select id, code, name from public.clients order by code;

select role, count(*) as profiles
from public.profiles group by role order by role;

select client_id, count(*) as surveys,
  count(*) filter (where location is null) as without_location,
  count(*) filter (where boundaries is null) as without_boundaries
from public.surveys group by client_id order by client_id;

select count(*) as orphan_orthos
from public.orthos o
left join public.surveys s on s.id = o.survey_id
where s.id is null;

select count(*) as orphan_point_clouds
from public.point_clouds p
left join public.surveys s on s.id = p.survey_id
where s.id is null;
```

Produce a human-reviewed mapping register for legacy organizations, people,
farms, surveys, and storage objects. The register must distinguish confirmed,
unclassified, and rejected mappings and must not contain secrets or Auth
credentials. Do not copy intern-project `auth.users` rows or identity IDs.

## Rehearse locally

```powershell
npx supabase start
npx supabase db reset
npx supabase db lint --local --level warning
```

Load a sanitized staging fixture, run
`supabase/verification/verify_expand.sql`, and exercise all role scenarios.

## Apply the expand phase

```powershell
npx supabase db push --linked
npx supabase db lint --linked --level warning
npx supabase gen types typescript --linked --schema public > lib/database.types.ts
```

Run `supabase/verification/verify_expand.sql`. Expected results:

- No client, assigned profile, or survey lacks its UUID relationship.
- Only intentionally pending profiles have no organization.
- No legacy code or current-output pointer mismatches exist.
- No imported survey remains an unclassified draft.
- Authorization helpers are absent from the exposed `public` schema.

Promote the bootstrap administrator only after confirming the UUID:

```sql
update public.profiles
set role = 'platform_admin'
where id = '<confirmed auth.users.id>'::uuid;
```

Require exactly one affected row and verify the user can sign in before
continuing.

## Applied additive domain foundation and next gate

Phase 3A introduced the reviewed domain schema additively. Keep these structures
non-destructive and do not rename or remove existing columns in the first release:

- A non-destructive client classification state plus separate
  `client_people`/`client_organizations` mappings to canonical records.
- Separate canonical people and organizations; organization type belongs on
  canonical organizations rather than being forced onto mixed clients.
- Optional profile-to-person links; organization-level profiles may remain
  unlinked.
- profiles.role as the account-level source of truth and profile-based
  organization membership roles with one live organization per normal account in
  v1.
- Separate organization/person and farm/person/organization domain metadata
  that grants no access automatically.
- `survey_farms` for many-to-many survey coverage and `survey_organizations`
  for requesting/participating organizations while retaining `client_id`.
- Explicit farm and survey grants; shared survey outputs require a survey grant.
- Survey-linked output/report metadata while preserving `orthos`,
  `point_clouds`, tile paths, and detection objects.
- Append-only audit records for sensitive administration.

Required indexes include every foreign key used by RLS or list/detail queries,
plus reviewed unique constraints for one live membership per normal profile,
client mappings, one primary farm per survey, grants, farm codes, and current
outputs. Nullable expand-phase fields must become required only in
a later contract migration after zero unresolved records are verified.

Before any canonical mapping or membership mutation is enabled, run the
Phase 3G-A audit migration locally and keep `supabase/verification/verify_domain_expand.sql`
expected-zero assertions equivalent to the following templates, adjusted to the
approved table and column names:

```sql
-- Classified clients without exactly one matching canonical mapping.
select count(*) from (
  select client.id, client.classification_kind
  from public.clients client
  left join public.client_organizations organization_mapping
    on organization_mapping.client_id = client.id
  left join public.client_people person_mapping
    on person_mapping.client_id = client.id
  group by client.id, client.classification_kind
  having
    (client.classification_kind = 'organization'
      and (count(distinct organization_mapping.organization_id) <> 1
        or count(distinct person_mapping.person_id) <> 0))
    or (client.classification_kind = 'individual'
      and (count(distinct person_mapping.person_id) <> 1
        or count(distinct organization_mapping.organization_id) <> 0))
    or (client.classification_kind = 'unclassified'
      and (count(distinct organization_mapping.organization_id)
        + count(distinct person_mapping.person_id)) <> 0)
) invalid_client_mappings;

-- Active farms without an approved owner or operator.
select count(*) from public.farms
where status = 'active'
  and owner_person_id is null
  and operator_organization_id is null;

-- Orphan survey/farm mappings.
select count(*)
from public.survey_farms mapping
left join public.surveys survey on survey.id = mapping.survey_id
left join public.farms farm on farm.id = mapping.farm_id
where survey.id is null or farm.id is null;

-- Normal profiles with more than one live organization membership.
select count(*) from (
  select profile_id
  from public.organization_memberships
  where status in ('invited', 'pending', 'active', 'suspended')
  group by profile_id having count(*) > 1
) duplicate_memberships;

-- Surveys with more than one primary farm.
select count(*) from (
  select survey_id
  from public.survey_farms
  group by survey_id
  having count(*) filter (where is_primary) > 1
) duplicate_primary_farms;

-- New output records that do not resolve to a survey.
select count(*)
from public.survey_outputs output
left join public.surveys survey on survey.id = output.survey_id
where survey.id is null;
```

Also assert that legacy profile/client and survey/client relationships still
match, current ortho and point-cloud pointers remain unchanged, no person was
created by treating a `clients` row as a farmer, no canonical record or farm was
inferred without an approved mapping, and each survey has at most one primary
`survey_farms` row.

Authorization coverage must include anonymous, unassigned user,
individual, organization member, legacy-role conversion,
organization admin, platform admin, farm-grant, and survey-grant cases. Test
permitted and denied
select/insert/update/delete operations through direct SQL/REST-equivalent calls,
including a second live membership, cross-organization IDs, farm ownership
without grants, farm grants without survey grants, profile/person relinking,
role escalation, farm reassignment, output access, RPC execution, and storage
downloads. The Phase 3F `clients` classification-field update must produce the existing
`audit_clients_domain_fields` trigger record. Phase 3G-A mapping table inserts,
updates, and deletes must produce composite-key audit records. Phase 3G-B and 3G-C RPCs
must reject non-platform callers and conflicting confirmed mappings. Phase 3H-B membership creation and Phase 3H-C status updates must be
platform-admin only, limited to ordinary `member` records for existing profiles
and organizations, audited by the existing membership trigger, and rejected
when a normal account already has a live membership. Phase 3H-C may approve,
suspend, reactivate, or mark ordinary memberships removed without deleting
records. These phases must not expose org-admin promotion, Auth-user creation,
service-role, or invite-email delivery paths. Every future
privileged mutation must produce an expected audit record; audit logging does
not make an otherwise unauthorized operation acceptable.

## Storage transition

Storage finalization and workshop asset cutover remain blocked until the approved RLS design accounts for
organization membership and explicit survey grants. An organization UUID path
alone cannot safely provide narrow access to one survey.

For the workshop release, prepare a reviewed manifest from
`docs/workshop-manifest-template.md` that links every selected asset to its
retained legacy source, canonical survey, authorized organization or explicit
grant, intended stable URL, object version, file count, total bytes, and
checksum set. The sanitized machine-readable shape is in
`docs/workshop-manifest.example.json`. The approved populated manifest is the
migration allowlist; absence from it means the dataset does not move before the
workshop.

1. Validate the approved manifest shape and approval state before any asset or
   storage operation.
2. Run the approved migration tooling in dry-run mode against the workshop
   manifest only.
3. Review source/destination counts, bytes, paths, and authorization metadata.
4. Apply the approved migration to the isolated/staging asset origin only.
5. Verify every source and destination checksum matches.
6. Deploy the UUID-compatible application to staging behind NGINX and Cloudflare.
7. Apply only the separately approved protected storage/asset policy.
8. Verify anonymous and cross-organization downloads fail. Organization members
   may retain the compatible organization object; explicit survey grants require
   separately verified survey-scoped detection objects before download access.
9. Test maps, tiles, detections, point clouds, and outputs through the public
   staging hostname from an external internet connection.
10. Rehearse switching the application and asset routes back to the previous
   image, object version, and retained legacy source.

Do not delete legacy root objects, source assets, full-history records, or
non-manifest datasets during this phase.

## Contract phase

After the observation window:

1. Confirm every legacy client is classified or intentionally retained as
   `unclassified`, and no farmer/contact has been forced into `clients`.
2. Confirm pending profiles are intentionally unassigned user accounts, have at
   most one live organization membership, or are explicitly promoted platform
   administrators.
3. Confirm required farms have reviewed metadata, required surveys have complete
   `survey_farms` mappings, and every output/report resolves to a survey.
4. Confirm legacy routes, UUID/code lookups, maps, tiles, point clouds,
   detections, and current output pointers pass parity checks.
5. Confirm organization membership, explicit farm/survey grant, direct-call,
   storage, and audit tests pass for every role.
6. Replace the existing deferred contract with a newly reviewed contract; do
   not move `supabase/deferred/contract_uuid_tenant_keys.sql` unchanged into
   migrations. Use a new timestamp only after approval.
7. Run the dry-run, backup, local rehearsal, staging apply, and verification
   sequence again.
8. Delete legacy storage objects only through a separately reviewed operation.

The contract must allow a `user` account to have no active membership. It must enforce at most one live organization membership for normal accounts and must
not make `surveys.client_id` the sole permanent relationship when surveys span
multiple farms.

## Backward compatibility during expansion

- Keep `clients.code` for `/dashboard/orthomap/[plantation]`, labels, local tile
  directories, and point-cloud asset paths.
- Keep `surveys.client_id`, reviewed client mappings, and required legacy code columns while routes and datasets still depend on them. They do not grant profile access by themselves.
- Preserve canonical people/organization mappings, memberships, `survey_farms`, and explicit grants. Unresolved clients may retain compatibility metadata but must not regain a profile-owned authorization fallback.
- Keep `orthos.survey_id`, `point_clouds.survey_id`, current-output uniqueness,
  and existing survey normalization in `lib/actions/surveys.ts`.
- Add farm and output/report relationships as nullable metadata first. Existing
  records continue through their current client and survey relationships while
  classifications are reviewed.
- Preserve UUID and legacy detection objects until the storage policy and
  application support approved organization and survey-scoped access paths and
  deletion is separately approved. Preserve local tile and point-cloud paths;
  database RLS does not secure files served from `public/tiles` or `public/3d`.

## Post-migration checks

Exercise login, logout, session refresh, OTP confirmation, profile updates,
dashboard lists, organization orthomaps, survey maps, detections, tiles, point
clouds, and any new people/farm/output/admin views. Test representative phone,
tablet, laptop, and desktop layouts plus constrained-network and large-file
behavior. Record pre-existing lint, type-check, and build failures separately:

For the workshop release, repeat the user-facing checks through the public
Cloudflare hostname from at least one network outside the origin environment.
Verify DNS, HTTPS, NGINX routing, cache headers, session expiry, removed-member
denial, anonymous denial, cross-organization denial, stable asset URLs, and
manifest completeness for every selected asset class.

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Do not use application success as a substitute for direct RLS, RPC, storage,
foreign-key, uniqueness, audit, and orphan verification.

## Recovery

For additive-phase application failure, redeploy the previous application;
legacy columns and storage objects remain intact.

For a future additive domain release, stop new domain writes and redeploy the
previous compatible application. Leave additive nullable tables/columns in
place unless a separately reviewed reversal is safer; never delete newly
captured people, farm, membership, access, output, report, or audit data merely
to roll back application code.

For database integrity or authorization failure, disable the affected release,
stop writes, preserve logs, and restore the tested pre-migration backup into an
isolated project before deciding whether to restore staging.

For workshop asset or internet-delivery failure, disable the affected dataset or
route, reactivate the previous application image and asset version/source,
invalidate only the affected Cloudflare cache entries, preserve NGINX/Cloudflare/
application/asset logs, and verify the rollback externally. Authorization
leakage, manifest mismatch, checksum failure, missing backup, broken stable URLs,
or failed external access tests block production promotion.
