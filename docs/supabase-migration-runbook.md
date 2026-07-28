# Supabase UUID Tenant and Domain Migration Runbook

Target staging project: `llealjcaqvltrtdwwzrh`

This runbook records the existing additive UUID migration and the gates required
before any farmer, organization, farm, survey-output, contract, or storage
change. Repository files do not prove current staging or production state.
Contract cleanup, storage finalization, and deletion of legacy objects require
separate approval.

No domain migration is authorized by this document. Future SQL must be created,
reviewed, and rehearsed only after the blocking human decisions below are
approved.

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
- Separate approval for Auth provisioning, output/report lifecycle, audit
  retention, invitation delivery, and protected asset delivery before those
  capabilities are implemented.

## Domain approval gate

Before drafting domain SQL, confirm and record:

1. Existing `clients` rows are mixed historical tenants. Preserve them and map
   reviewed rows separately to canonical people or organizations; unresolved
   records remain `unclassified`.
2. `profiles` remains the application-account table. Existing rows may be
   organization-level accounts; future people may have no login.
3. Global account role (`platform_admin` or `individual`) is separate from
   organization membership role (`org_admin` or `member`).
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

## Delivery gates

- Production deployment target: September 28-30, 2026.
- Stabilization, documentation, and handoff: October 1-9, 2026.
- Final completion deadline: October 9, 2026.
- Initial rollout: internal/platform administrators, followed by one known
  cooperative or organization.
- Rollback authority: technical owner/project lead.

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

## Future additive domain migration checklist

This section applies only after a separately approved migration introduces the
reviewed domain schema. Add structures without renaming or removing existing
columns in the first release:

- A non-destructive client classification state plus separate
  `client_people`/`client_organizations` mappings to canonical records.
- Separate canonical people and organizations; organization type belongs on
  canonical organizations rather than being forced onto mixed clients.
- Optional profile-to-person links; organization-level profiles may remain
  unlinked.
- Separate global account role and profile-based organization membership with
  one live organization per normal account.
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

Create `supabase/verification/verify_domain_expand.sql` with expected-zero
assertions equivalent to the following templates, adjusted to the approved
table and column names:

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
downloads. Every privileged mutation must produce the expected audit record;
audit logging does not make an otherwise unauthorized operation acceptable.

## Storage transition

Storage finalization remains blocked until the approved RLS design accounts for
organization membership and explicit survey grants. An organization UUID path
alone cannot safely provide narrow access to one survey.

1. Run `npm run migrate-detected-objects` for a dry-run report.
2. Run `npm run migrate-detected-objects:apply`.
3. Verify every source and destination SHA-256 digest matches.
4. Deploy the UUID-compatible application.
5. Apply `supabase/deferred/secure_detected_objects_storage.sql`.
6. Verify anonymous and cross-organization downloads fail. Organization members
   may retain the compatible organization object; explicit survey grants require
   separately verified survey-scoped detection objects before download access.

Do not delete legacy root objects during this phase.

## Contract phase

After the observation window:

1. Confirm every legacy client is classified or intentionally retained as
   `unclassified`, and no farmer/contact has been forced into `clients`.
2. Confirm pending profiles are intentionally individual, have at most one live
   organization membership, or are explicitly promoted platform administrators.
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
`organization_id`, because an `individual` account may be unassigned. It must
enforce at most one live organization membership for normal accounts and must
not make `surveys.client_id` the sole permanent relationship when surveys span
multiple farms.

## Backward compatibility during expansion

- Keep `clients.code` for `/dashboard/orthomap/[plantation]`, labels, local tile
  directories, and point-cloud asset paths.
- Keep `profiles.organization_id`, `profiles.role`, `surveys.client_id`, and
  legacy code columns until compatible reads and RLS pass the observation gate.
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
