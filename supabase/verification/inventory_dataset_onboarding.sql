-- Aggregate-only pre/post inventory for Platform Admin Dataset Onboarding.
-- This emits no names, emails, survey identifiers, or asset paths.

select jsonb_build_object(
  'client_classification_counts', (
    select coalesce(jsonb_object_agg(classification_kind, row_count), '{}'::jsonb)
    from (
      select classification_kind, count(*) as row_count
      from public.clients
      group by classification_kind
    ) as summary
  ),
  'active_organizations', (
    select count(*) from public.organizations where status = 'active'
  ),
  'active_people', (
    select count(*) from public.people where status = 'active'
  ),
  'active_farms', (
    select count(*) from public.farms where status = 'active'
  ),
  'confirmed_farm_organization_relationships', (
    select count(*) from public.farm_organizations
    where review_status = 'confirmed'
  ),
  'qualifying_farm_organization_relationships', (
    select count(*) from public.farm_organizations
    where review_status = 'confirmed'
      and relationship_type in ('owner', 'operator')
  ),
  'confirmed_farm_person_relationships', (
    select count(*) from public.farm_people
    where review_status = 'confirmed'
  ),
  'qualifying_farm_person_relationships', (
    select count(*) from public.farm_people
    where review_status = 'confirmed'
      and relationship_type in ('owner', 'operator')
  )
) as dataset_onboarding_reference_inventory;

select jsonb_build_object(
  'clients_with_multiple_confirmed_organization_owners', (
    select count(*) from (
      select client_id
      from public.client_organizations
      where review_status = 'confirmed'
      group by client_id
      having count(distinct organization_id) > 1
    ) as conflicts
  ),
  'clients_with_multiple_confirmed_private_owners', (
    select count(*) from (
      select client_id
      from public.client_people
      where review_status = 'confirmed'
      group by client_id
      having count(distinct person_id) > 1
    ) as conflicts
  ),
  'clients_with_confirmed_mixed_owner_kinds', (
    select count(*)
    from public.clients as client
    where exists (
      select 1 from public.client_organizations
      where client_id = client.id and review_status = 'confirmed'
    )
      and exists (
        select 1 from public.client_people
        where client_id = client.id and review_status = 'confirmed'
      )
  ),
  'duplicate_case_insensitive_client_codes', (
    select count(*) from (
      select lower(code)
      from public.clients
      group by lower(code)
      having count(*) > 1
    ) as duplicates
  ),
  'duplicate_case_insensitive_survey_ids', (
    select count(*) from (
      select lower(id)
      from public.surveys
      group by lower(id)
      having count(*) > 1
    ) as duplicates
  )
) as dataset_onboarding_conflict_inventory;

select jsonb_build_object(
  'preview_rpc_exists',
    to_regprocedure(
      'public.platform_admin_preview_dataset_onboarding(jsonb)'
    ) is not null,
  'commit_rpc_exists',
    to_regprocedure(
      'public.platform_admin_commit_dataset_onboarding(jsonb)'
    ) is not null,
  'authenticated_can_execute_preview',
    case when to_regprocedure(
      'public.platform_admin_preview_dataset_onboarding(jsonb)'
    ) is null then false else has_function_privilege(
      'authenticated',
      to_regprocedure(
        'public.platform_admin_preview_dataset_onboarding(jsonb)'
      ),
      'EXECUTE'
    ) end,
  'authenticated_can_execute_commit',
    case when to_regprocedure(
      'public.platform_admin_commit_dataset_onboarding(jsonb)'
    ) is null then false else has_function_privilege(
      'authenticated',
      to_regprocedure(
        'public.platform_admin_commit_dataset_onboarding(jsonb)'
      ),
      'EXECUTE'
    ) end,
  'anon_can_execute_preview',
    case when to_regprocedure(
      'public.platform_admin_preview_dataset_onboarding(jsonb)'
    ) is null then false else has_function_privilege(
      'anon',
      to_regprocedure(
        'public.platform_admin_preview_dataset_onboarding(jsonb)'
      ),
      'EXECUTE'
    ) end,
  'anon_can_execute_commit',
    case when to_regprocedure(
      'public.platform_admin_commit_dataset_onboarding(jsonb)'
    ) is null then false else has_function_privilege(
      'anon',
      to_regprocedure(
        'public.platform_admin_commit_dataset_onboarding(jsonb)'
      ),
      'EXECUTE'
    ) end
) as dataset_onboarding_rpc_inventory;
