# Supabase UUID Tenant and Domain Migration Runbook

Target staging project: `llealjcaqvltrtdwwzrh`

This runbook records the existing additive UUID migration, the additive Phase 3A
domain foundation, and the gates required before any classification, membership,
contract, storage, or asset-delivery change. Repository files do not prove
current staging or production state.
Contract cleanup, storage finalization, and deletion of legacy objects require
separate approval.

Phase 3F authorizes only the application-level `clients` classification-field
update path for platform admins. Phase 3G-A adds audit infrastructure for
`client_people` and `client_organizations`. Phase 3G-B authorizes checked RPCs
that map a legacy client to an existing canonical person or organization.
Phase 3G-C authorizes checked RPCs that create minimal canonical people or
organizations and immediately map them to a legacy client. Phase 3H-A adds
read-only membership review views. Phase 3H-B adds a platform-admin-only
server action for creating ordinary member memberships for existing profiles and
existing organizations. Phase 3H-C adds platform-admin-only status changes for
ordinary member memberships without deleting records or changing roles. Future SQL
or server actions for org-admin promotion, Auth-user creation, farm, grant,
output, storage, or destructive mutations
must be created, reviewed, and rehearsed only after the blocking human decisions
below are approved.

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
- Approved role-source-of-truth model from
  `docs/role-permission-model-and-migration-plan.md` before account-role
  cleanup or membership role expansion.
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
   `organization_memberships.role`, with target values `org_admin`, `editor`, and
   `viewer`.
4. Normal accounts have at most one live organization membership in v1.
5. Farms/plantation areas are separate from people and organizations, and their
   owner/operator/contact metadata does not grant access.
6. Surveys remain the mission records and relate to multiple farms through
   `survey_farms`, not one canonical `surveys.farm_id`.
7. A farm grant exposes only the farm record; a separate survey grant is
   required for shared survey data and outputs.
8. Every new output/report record traces to a survey; existing `orthos` and
   `point_clouds` continue using `survey_id`.

Do not apply `supabase/deferred/contract_uuid_tenant_keys.sql` or
`supabase/deferred/secure_detected_objects_storage.sql` while any blocking
domain or authorization decision remains unresolved.

## Role cleanup pre-contract gate

Follow `docs/role-permission-model-and-migration-plan.md` before any contract
cleanup. The required path is: remove active app/RLS/test dependence on
`profiles.account_role`; drop that column/enum/helpers only after no active code,
SQL, tests, verification, or generated types reference it; expand
`organization_memberships.role` to `org_admin`, `editor`, and `viewer`; backfill
memberships from `profiles.organization_id` only through approved canonical
organization mappings; normalize non-platform `profiles.role` values to `user`;
then cut authorization to memberships and explicit grants with a temporary legacy
fallback.

`profiles.organization_id` must not be dropped during this cleanup. It remains
the legacy compatibility tenant pointer until membership/grant authorization,
protected asset access, route behavior, and direct RLS tests all pass without
fallback.

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

select role, count(*) as profiles,
  count(*) filter (where organization_id is null) as unassigned
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

Extend `supabase/tests/authorization.sql` to cover anonymous, unassigned user,
individual, organization member, legacy viewer/editor compatibility,
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

The contract must not require every non-platform profile to have an
`organization_id`, because a `user` account may be unassigned. It must
enforce at most one live organization membership for normal accounts and must
not make `surveys.client_id` the sole permanent relationship when surveys span
multiple farms.

## Backward compatibility during expansion

- Keep `clients.code` for `/dashboard/orthomap/[plantation]`, labels, local tile
  directories, and point-cloud asset paths.
- Keep `profiles.organization_id`, `surveys.client_id`, legacy code columns, and
  current role compatibility until compatible reads and RLS pass the observation
  gate. `profiles.role` is the long-term account-level source of truth, but
  non-platform values must not be normalized to `user` until the role migration
  gate passes.
- Add canonical people/organization mappings, memberships, `survey_farms`, and
  explicit grants alongside legacy relationships; unresolved clients continue
  through the current tenant path.
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
