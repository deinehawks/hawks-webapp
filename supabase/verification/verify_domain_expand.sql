-- Phase 3A domain verification queries.
--
-- Run read-only after applying the domain foundation to a local or isolated
-- Supabase database. Expected-zero queries should return 0 before staging is
-- considered.

select
  count(*) filter (where classification_kind = 'unclassified')
    as unclassified_clients,
  count(*) filter (where classification_kind = 'organization')
    as organization_clients,
  count(*) filter (where classification_kind = 'individual')
    as individual_clients,
  count(*) filter (where classification_kind = 'other')
    as other_clients
from public.clients;

-- EXPECT ZERO: classified clients without exactly one matching confirmed
-- canonical mapping.
select count(*) as invalid_client_mappings
from (
  select
    client.id,
    client.classification_kind,
    count(distinct organization_mapping.organization_id)
      filter (where organization_mapping.review_status = 'confirmed')
      as confirmed_organizations,
    count(distinct person_mapping.person_id)
      filter (where person_mapping.review_status = 'confirmed')
      as confirmed_people
  from public.clients as client
  left join public.client_organizations as organization_mapping
    on organization_mapping.client_id = client.id
  left join public.client_people as person_mapping
    on person_mapping.client_id = client.id
  group by client.id, client.classification_kind
  having
    (
      client.classification_kind = 'organization'
      and (
        count(distinct organization_mapping.organization_id)
          filter (where organization_mapping.review_status = 'confirmed') <> 1
        or count(distinct person_mapping.person_id)
          filter (where person_mapping.review_status = 'confirmed') <> 0
      )
    )
    or (
      client.classification_kind = 'individual'
      and (
        count(distinct person_mapping.person_id)
          filter (where person_mapping.review_status = 'confirmed') <> 1
        or count(distinct organization_mapping.organization_id)
          filter (where organization_mapping.review_status = 'confirmed') <> 0
      )
    )
    or (
      client.classification_kind = 'unclassified'
      and (
        count(distinct organization_mapping.organization_id)
          filter (where organization_mapping.review_status = 'confirmed')
        + count(distinct person_mapping.person_id)
          filter (where person_mapping.review_status = 'confirmed')
      ) <> 0
    )
) as invalid;

-- EXPECT ZERO: normal accounts with more than one live organization
-- membership.
select count(*) as duplicate_live_memberships
from (
  select profile_id
  from public.organization_memberships
  where status in ('invited', 'pending', 'active', 'suspended')
  group by profile_id
  having count(*) > 1
) as duplicate_memberships;

-- EXPECT ZERO: active organization admins without recorded approval from a
-- platform-admin account.
select count(*) as unapproved_active_org_admin_memberships
from public.organization_memberships as membership
left join public.profiles as approver
  on approver.id = membership.approved_by
where membership.role = 'org_admin'
  and membership.status = 'active'
  and (
    membership.approved_by is null
    or approver.account_role <> 'platform_admin'
  );

-- EXPECT ZERO: survey/farm mappings pointing to missing records.
select count(*) as orphan_survey_farms
from public.survey_farms as mapping
left join public.surveys as survey on survey.id = mapping.survey_id
left join public.farms as farm on farm.id = mapping.farm_id
where survey.id is null
  or farm.id is null;

-- EXPECT ZERO: surveys with more than one primary farm.
select count(*) as surveys_with_multiple_primary_farms
from (
  select survey_id
  from public.survey_farms
  group by survey_id
  having count(*) filter (where is_primary) > 1
) as duplicate_primary_farms;

-- REVIEW COUNT: farm owner/operator/contact metadata does not grant access by
-- itself. Rows here are allowed, but any intended login access must also have
-- an explicit grant or organization membership path.
select count(*) as farm_relationships_without_explicit_grant_for_review
from public.farm_people as farm_person
where exists (
  select 1
  from public.profiles as profile
  where profile.person_id = farm_person.person_id
)
and not exists (
  select 1
  from public.farm_access_grants as grant_row
  join public.profiles as profile
    on profile.id = grant_row.profile_id
  where profile.person_id = farm_person.person_id
    and grant_row.farm_id = farm_person.farm_id
    and grant_row.status = 'active'
);

-- REVIEW COUNT: farm grants alone must not create survey grants. Rows here are
-- allowed and should remain unable to read survey/output records unless a
-- matching survey grant also exists.
select count(*) as farm_grants_without_survey_grants_for_review
from public.farm_access_grants as farm_grant
join public.survey_farms as survey_farm
  on survey_farm.farm_id = farm_grant.farm_id
where farm_grant.status = 'active'
  and not exists (
    select 1
    from public.survey_access_grants as survey_grant
    where survey_grant.profile_id = farm_grant.profile_id
      and survey_grant.survey_id = survey_farm.survey_id
      and survey_grant.status = 'active'
  );

-- EXPECT ZERO: output records without a real survey.
select count(*) as orphan_survey_outputs
from public.survey_outputs as output
left join public.surveys as survey on survey.id = output.survey_id
where survey.id is null;

-- EXPECT ZERO: more than one current output per survey and type.
select count(*) as duplicate_current_outputs
from (
  select survey_id, output_type
  from public.survey_outputs
  where is_current
  group by survey_id, output_type
  having count(*) > 1
) as duplicate_outputs;

-- EXPECT ZERO: additive migration must not break existing UUID compatibility.
select
  (
    select count(*)
    from public.profiles
    where coalesce(organization, access_code) is not null
      and organization_id is null
  ) as assigned_profiles_without_uuid,
  (
    select count(*)
    from public.surveys
    where client_id is null
  ) as surveys_without_uuid;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select routine_schema, routine_name, security_type
from information_schema.routines
where routine_schema in ('app_private', 'public')
order by routine_schema, routine_name;

-- EXPECT ZERO: no private helper is executable by anonymous callers.
select count(*) as anon_executable_private_functions
from pg_proc as procedure
join pg_namespace as namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname = 'app_private'
  and has_function_privilege('anon', procedure.oid, 'EXECUTE');

-- EXPECT ZERO: trigger-only functions are not directly executable by normal
-- authenticated callers.
select count(*) as authenticated_executable_trigger_functions
from pg_proc as procedure
join pg_namespace as namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname = 'app_private'
  and procedure.proname in (
    'domain_audit_client_mapping_row',
    'domain_audit_row',
    'enforce_organization_protected_fields',
    'enforce_profile_protected_fields',
    'handle_new_user',
    'rls_auto_enable',
    'set_survey_created_by'
  )
  and has_function_privilege(
    'authenticated',
    procedure.oid,
    'EXECUTE'
  );

-- EXPECT ZERO: client mapping tables must have composite-key audit triggers.
select count(*) as missing_client_mapping_audit_triggers
from (
  values
    ('client_people', 'audit_client_people'),
    ('client_organizations', 'audit_client_organizations')
) as expected(table_name, trigger_name)
where not exists (
  select 1
  from pg_trigger as trigger
  join pg_class as table_class
    on table_class.oid = trigger.tgrelid
  join pg_namespace as namespace
    on namespace.oid = table_class.relnamespace
  join pg_proc as procedure
    on procedure.oid = trigger.tgfoid
  join pg_namespace as procedure_namespace
    on procedure_namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and table_class.relname = expected.table_name
    and trigger.tgname = expected.trigger_name
    and not trigger.tgisinternal
    and procedure_namespace.nspname = 'app_private'
    and procedure.proname = 'domain_audit_client_mapping_row'
);


-- EXPECT ZERO: anonymous callers cannot execute public admin mapping RPCs.
select count(*) as anon_executable_admin_mapping_functions
from pg_proc as procedure
join pg_namespace as namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname in (
    'admin_confirm_client_organization_mapping',
    'admin_confirm_client_person_mapping'
  )
  and has_function_privilege('anon', procedure.oid, 'EXECUTE');


-- EXPECT ZERO: anonymous callers cannot execute public admin create-and-map RPCs.
select count(*) as anon_executable_admin_create_mapping_functions
from pg_proc as procedure
join pg_namespace as namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname in (
    'admin_create_organization_for_client_mapping',
    'admin_create_person_for_client_mapping'
  )
  and has_function_privilege('anon', procedure.oid, 'EXECUTE');
