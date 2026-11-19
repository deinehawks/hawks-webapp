-- Platform-admin dataset onboarding.
-- One reviewed request creates or selects one canonical client, confirms one
-- existing owner, assigns one existing primary farm, and creates 1-100 draft
-- survey identities atomically.

create or replace function app_private.validate_dataset_onboarding(
  onboarding_payload jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  validation_errors jsonb := '[]'::jsonb;
  validation_warnings jsonb := '[]'::jsonb;
  client_mode text := onboarding_payload #>> '{client,mode}';
  client_id_text text := onboarding_payload #>> '{client,id}';
  client_code text := upper(btrim(coalesce(onboarding_payload #>> '{client,code}', '')));
  client_name text := btrim(coalesce(onboarding_payload #>> '{client,name}', ''));
  ownership_kind text := onboarding_payload #>> '{ownership,kind}';
  owner_id_text text;
  owner_name text;
  farm_id_text text := onboarding_payload ->> 'primaryFarmId';
  farm_name text;
  expected_classification public.client_classification_kind;
  selected_client public.clients%rowtype;
  selected_client_id uuid;
  selected_owner_id uuid;
  selected_farm_id uuid;
  survey_item jsonb;
  raw_survey_id text;
  normalized_survey_id text;
  normalized_survey_ids text[] := array[]::text[];
  existing_survey_ids text[] := array[]::text[];
  will_create_owner_mapping boolean := false;
  will_classify_client boolean := false;
begin
  if onboarding_payload is null or jsonb_typeof(onboarding_payload) <> 'object' then
    return jsonb_build_object(
      'valid', false,
      'errors', jsonb_build_array(jsonb_build_object(
        'field', 'request', 'code', 'invalid_payload',
        'message', 'The onboarding request must be an object.'
      )),
      'warnings', '[]'::jsonb,
      'normalized', null
    );
  end if;

  if client_mode not in ('existing', 'new') or client_mode is null then
    validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
      'field', 'client.mode', 'code', 'invalid_client_mode',
      'message', 'Choose an existing client or create a new client.'
    ));
  end if;

  if ownership_kind = 'organization' then
    expected_classification := 'organization';
    owner_id_text := onboarding_payload #>> '{ownership,organizationId}';
  elsif ownership_kind = 'private' then
    expected_classification := 'individual';
    owner_id_text := onboarding_payload #>> '{ownership,personId}';
  else
    validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
      'field', 'ownership.kind', 'code', 'invalid_ownership_kind',
      'message', 'Choose organization or private ownership.'
    ));
  end if;

  if client_mode = 'new' then
    if client_code = '' then
      validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
        'field', 'client.code', 'code', 'client_code_required',
        'message', 'A client code is required.'
      ));
    elsif length(client_code) > 80 then
      validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
        'field', 'client.code', 'code', 'client_code_too_long',
        'message', 'Client codes must be 80 characters or fewer.'
      ));
    elsif exists (
      select 1 from public.clients as candidate
      where lower(candidate.code) = lower(client_code)
    ) then
      validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
        'field', 'client.code', 'code', 'client_code_exists',
        'message', 'That client code already exists.'
      ));
    end if;

    if client_name = '' then
      validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
        'field', 'client.name', 'code', 'client_name_required',
        'message', 'A client name is required.'
      ));
    elsif length(client_name) > 200 then
      validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
        'field', 'client.name', 'code', 'client_name_too_long',
        'message', 'Client names must be 200 characters or fewer.'
      ));
    end if;
  elsif client_mode = 'existing' then
    if coalesce(client_id_text, '') !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then
      validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
        'field', 'client.id', 'code', 'invalid_client_id',
        'message', 'Choose a valid existing client.'
      ));
    else
      selected_client_id := client_id_text::uuid;
      select * into selected_client from public.clients where id = selected_client_id;
      if not found then
        validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
          'field', 'client.id', 'code', 'client_not_found',
          'message', 'The selected client was not found.'
        ));
      else
        client_code := selected_client.code;
        client_name := coalesce(selected_client.name, selected_client.code);
        if expected_classification is not null
          and selected_client.classification_kind not in (
            'unclassified'::public.client_classification_kind,
            expected_classification
          )
        then
          validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
            'field', 'client.id', 'code', 'client_classification_conflict',
            'message', 'The selected client classification conflicts with the ownership type.'
          ));
        elsif selected_client.classification_kind = 'unclassified' then
          will_classify_client := true;
          validation_warnings := validation_warnings || jsonb_build_array(jsonb_build_object(
            'field', 'client.id', 'code', 'client_will_be_classified',
            'message', 'The existing client will be classified during commit.'
          ));
        end if;
      end if;
    end if;
  end if;

  if coalesce(owner_id_text, '') !~*
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
      'field', 'ownership', 'code', 'invalid_owner_id',
      'message', 'Choose a valid existing owner.'
    ));
  else
    selected_owner_id := owner_id_text::uuid;
    if ownership_kind = 'organization' then
      select organization.name into owner_name
      from public.organizations as organization
      where organization.id = selected_owner_id and organization.status = 'active';
      if not found then
        validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
          'field', 'ownership.organizationId', 'code', 'active_organization_not_found',
          'message', 'The selected organization is not active or no longer exists.'
        ));
      end if;
    elsif ownership_kind = 'private' then
      select coalesce(
        nullif(person.display_name, ''),
        nullif(concat_ws(' ', person.first_name, person.last_name), ''),
        person.email,
        person.id::text
      ) into owner_name
      from public.people as person
      where person.id = selected_owner_id and person.status = 'active';
      if not found then
        validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
          'field', 'ownership.personId', 'code', 'active_person_not_found',
          'message', 'The selected private owner is not active or no longer exists.'
        ));
      end if;
    end if;
  end if;

  if coalesce(farm_id_text, '') !~*
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
      'field', 'primaryFarmId', 'code', 'invalid_farm_id',
      'message', 'Choose a valid existing primary farm.'
    ));
  else
    selected_farm_id := farm_id_text::uuid;
    select farm.name into farm_name from public.farms as farm
    where farm.id = selected_farm_id and farm.status = 'active';
    if not found then
      validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
        'field', 'primaryFarmId', 'code', 'active_farm_not_found',
        'message', 'The selected farm is not active or no longer exists.'
      ));
    elsif selected_owner_id is not null and owner_name is not null then
      if ownership_kind = 'organization' and not exists (
        select 1 from public.farm_organizations as farm_owner
        where farm_owner.farm_id = selected_farm_id
          and farm_owner.organization_id = selected_owner_id
          and farm_owner.review_status = 'confirmed'
          and farm_owner.relationship_type in ('owner', 'operator')
      ) then
        validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
          'field', 'primaryFarmId', 'code', 'farm_owner_mismatch',
          'message', 'The farm has no confirmed owner or operator relationship with the selected organization.'
        ));
      elsif ownership_kind = 'private' and not exists (
        select 1 from public.farm_people as farm_owner
        where farm_owner.farm_id = selected_farm_id
          and farm_owner.person_id = selected_owner_id
          and farm_owner.review_status = 'confirmed'
          and farm_owner.relationship_type in ('owner', 'operator')
      ) then
        validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
          'field', 'primaryFarmId', 'code', 'farm_owner_mismatch',
          'message', 'The farm has no confirmed owner or operator relationship with the selected private owner.'
        ));
      end if;
    end if;
  end if;

  if jsonb_typeof(onboarding_payload -> 'surveyIds') is distinct from 'array' then
    validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
      'field', 'surveyIds', 'code', 'invalid_survey_ids',
      'message', 'Survey IDs must be provided as a list.'
    ));
  elsif jsonb_array_length(onboarding_payload -> 'surveyIds') < 1
    or jsonb_array_length(onboarding_payload -> 'surveyIds') > 100
  then
    validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
      'field', 'surveyIds', 'code', 'invalid_survey_count',
      'message', 'Provide between 1 and 100 survey IDs.'
    ));
  else
    for survey_item in
      select value from jsonb_array_elements(onboarding_payload -> 'surveyIds')
    loop
      if jsonb_typeof(survey_item) <> 'string' then
        validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
          'field', 'surveyIds', 'code', 'invalid_survey_id',
          'message', 'Every survey ID must be text.'
        ));
        continue;
      end if;

      raw_survey_id := survey_item #>> '{}';
      normalized_survey_id := upper(btrim(raw_survey_id));
      if normalized_survey_id = '' or length(normalized_survey_id) > 200 then
        validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
          'field', 'surveyIds', 'code', 'invalid_survey_id',
          'message', 'Survey IDs must contain 1 to 200 characters.',
          'value', raw_survey_id
        ));
      elsif normalized_survey_id = any(normalized_survey_ids) then
        validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
          'field', 'surveyIds', 'code', 'duplicate_survey_id',
          'message', 'A survey ID appears more than once in this batch.',
          'value', normalized_survey_id
        ));
      else
        normalized_survey_ids := array_append(normalized_survey_ids, normalized_survey_id);
      end if;
    end loop;

    select coalesce(array_agg(survey.id order by survey.id), array[]::text[])
      into existing_survey_ids
    from public.surveys as survey
    where upper(btrim(survey.id)) = any(normalized_survey_ids);

    if cardinality(existing_survey_ids) > 0 then
      validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
        'field', 'surveyIds', 'code', 'survey_ids_exist',
        'message', 'One or more survey IDs already exist.',
        'values', to_jsonb(existing_survey_ids)
      ));
    end if;
  end if;

  if client_mode = 'existing'
    and selected_client.id is not null
    and selected_owner_id is not null
    and expected_classification is not null
  then
    if ownership_kind = 'organization' then
      if exists (
        select 1 from public.client_people
        where client_id = selected_client.id
          and (
            review_status = 'confirmed'
            or (review_status = 'pending' and is_primary)
          )
      ) or exists (
        select 1 from public.client_organizations
        where client_id = selected_client.id
          and organization_id <> selected_owner_id
          and (
            review_status = 'confirmed'
            or (review_status = 'pending' and is_primary)
          )
      ) then
        validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
          'field', 'client.id', 'code', 'client_owner_conflict',
          'message', 'The selected client already has a different confirmed owner.'
        ));
      end if;
      will_create_owner_mapping := not exists (
        select 1 from public.client_organizations
        where client_id = selected_client.id
          and organization_id = selected_owner_id
          and review_status = 'confirmed' and is_primary
      );
    elsif ownership_kind = 'private' then
      if exists (
        select 1 from public.client_organizations
        where client_id = selected_client.id
          and (
            review_status = 'confirmed'
            or (review_status = 'pending' and is_primary)
          )
      ) or exists (
        select 1 from public.client_people
        where client_id = selected_client.id
          and person_id <> selected_owner_id
          and (
            review_status = 'confirmed'
            or (review_status = 'pending' and is_primary)
          )
      ) then
        validation_errors := validation_errors || jsonb_build_array(jsonb_build_object(
          'field', 'client.id', 'code', 'client_owner_conflict',
          'message', 'The selected client already has a different confirmed owner.'
        ));
      end if;
      will_create_owner_mapping := not exists (
        select 1 from public.client_people
        where client_id = selected_client.id
          and person_id = selected_owner_id
          and review_status = 'confirmed' and is_primary
      );
    end if;
  elsif client_mode = 'new' then
    will_create_owner_mapping := true;
  end if;

  if will_create_owner_mapping then
    validation_warnings := validation_warnings || jsonb_build_array(jsonb_build_object(
      'field', 'ownership', 'code', 'owner_mapping_will_be_created',
      'message', 'A confirmed primary client-owner mapping will be created.'
    ));
  end if;

  return jsonb_build_object(
    'valid', jsonb_array_length(validation_errors) = 0,
    'errors', validation_errors,
    'warnings', validation_warnings,
    'normalized', jsonb_build_object(
      'client', jsonb_build_object(
        'mode', client_mode,
        'id', case when selected_client.id is null then null else selected_client.id::text end,
        'code', nullif(client_code, ''),
        'name', nullif(client_name, ''),
        'classificationKind', expected_classification,
        'willCreate', client_mode = 'new',
        'willClassify', will_classify_client,
        'willCreateOwnerMapping', will_create_owner_mapping
      ),
      'ownership', jsonb_build_object(
        'kind', ownership_kind, 'id', owner_id_text, 'name', owner_name
      ),
      'primaryFarm', jsonb_build_object(
        'id', farm_id_text, 'name', farm_name, 'relationshipType', 'operator'
      ),
      'surveyIds', to_jsonb(normalized_survey_ids),
      'surveyDefaults', jsonb_build_object(
        'status', 'draft', 'code', nullif(client_code, ''),
        'accessCode', nullif(client_code, ''), 'organizationCode', null
      )
    ),
    'summary', jsonb_build_object(
      'surveyCount', cardinality(normalized_survey_ids),
      'ownerMappingWillBeCreated', will_create_owner_mapping,
      'clientWillBeCreated', client_mode = 'new'
    )
  );
end
$$;

create or replace function public.platform_admin_preview_dataset_onboarding(
  onboarding_payload jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app_private.domain_is_platform_admin() then
    raise exception 'platform administrator access required' using errcode = '42501';
  end if;
  return app_private.validate_dataset_onboarding(onboarding_payload);
end
$$;

create or replace function public.platform_admin_commit_dataset_onboarding(
  onboarding_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  validation_result jsonb;
  normalized_payload jsonb;
  normalized_client jsonb;
  ownership_kind text;
  resolved_client_id uuid;
  resolved_client_code text;
  resolved_client_name text;
  resolved_owner_id uuid;
  resolved_farm_id uuid;
  committed_survey_ids text[];
  audit_id uuid;
begin
  if not app_private.domain_is_platform_admin() then
    raise exception 'platform administrator access required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(20260911000000);
  validation_result := app_private.validate_dataset_onboarding(onboarding_payload);
  if not coalesce((validation_result ->> 'valid')::boolean, false) then
    raise exception 'dataset onboarding validation failed'
      using errcode = '22023', detail = validation_result::text;
  end if;

  normalized_payload := validation_result -> 'normalized';
  normalized_client := normalized_payload -> 'client';
  ownership_kind := normalized_payload #>> '{ownership,kind}';
  resolved_owner_id := (normalized_payload #>> '{ownership,id}')::uuid;
  resolved_farm_id := (normalized_payload #>> '{primaryFarm,id}')::uuid;
  resolved_client_code := normalized_client ->> 'code';
  resolved_client_name := normalized_client ->> 'name';

  select array_agg(value order by ordinal) into committed_survey_ids
  from jsonb_array_elements_text(normalized_payload -> 'surveyIds')
    with ordinality as survey_id(value, ordinal);

  if normalized_client ->> 'mode' = 'new' then
    insert into public.clients (
      code, name, classification_kind,
      classification_reviewed_at, classification_reviewed_by
    ) values (
      resolved_client_code, resolved_client_name,
      (normalized_client ->> 'classificationKind')::public.client_classification_kind,
      now(), auth.uid()
    ) returning id into resolved_client_id;
  else
    resolved_client_id := (normalized_client ->> 'id')::uuid;
    update public.clients
    set classification_kind = (normalized_client ->> 'classificationKind')::public.client_classification_kind,
        classification_reviewed_at = now(),
        classification_reviewed_by = auth.uid()
    where id = resolved_client_id and classification_kind = 'unclassified';
  end if;

  if ownership_kind = 'organization' then
    insert into public.client_organizations (
      client_id, organization_id, relationship_type, review_status,
      is_primary, notes, created_by
    ) values (
      resolved_client_id, resolved_owner_id, 'legacy_client', 'confirmed', true,
      'Confirmed through dataset onboarding', auth.uid()
    )
    on conflict (client_id, organization_id) do update set
      relationship_type = 'legacy_client', review_status = 'confirmed',
      is_primary = true, notes = excluded.notes,
      created_by = coalesce(public.client_organizations.created_by, auth.uid());
  else
    insert into public.client_people (
      client_id, person_id, relationship_type, review_status,
      is_primary, notes, created_by
    ) values (
      resolved_client_id, resolved_owner_id, 'legacy_client', 'confirmed', true,
      'Confirmed through dataset onboarding', auth.uid()
    )
    on conflict (client_id, person_id) do update set
      relationship_type = 'legacy_client', review_status = 'confirmed',
      is_primary = true, notes = excluded.notes,
      created_by = coalesce(public.client_people.created_by, auth.uid());
  end if;

  insert into public.surveys (
    id, code, access_code, organization_code, client_id, status, created_by
  )
  select survey_id, resolved_client_code, resolved_client_code, null,
    resolved_client_id, 'draft', auth.uid()
  from unnest(committed_survey_ids) as survey_id;

  insert into public.survey_farms (
    survey_id, farm_id, relationship_type, is_primary, notes, created_by
  )
  select survey_id, resolved_farm_id, 'operator', true,
    'Primary farm assigned through dataset onboarding', auth.uid()
  from unnest(committed_survey_ids) as survey_id;

  if ownership_kind = 'organization' then
    insert into public.survey_organizations (
      survey_id, organization_id, relationship_type, review_status, notes, created_by
    )
    select survey_id, resolved_owner_id, 'requester', 'confirmed',
      'Confirmed through dataset onboarding', auth.uid()
    from unnest(committed_survey_ids) as survey_id;
  end if;

  insert into public.admin_audit_log (
    actor_profile_id, action, table_schema, table_name, record_pk, metadata
  ) values (
    auth.uid(), 'DATASET_ONBOARDING_COMMIT', 'public', 'surveys',
    jsonb_build_object(
      'client_id', resolved_client_id,
      'survey_ids', to_jsonb(committed_survey_ids)
    ),
    jsonb_build_object(
      'client_code', resolved_client_code, 'ownership_kind', ownership_kind,
      'owner_id', resolved_owner_id, 'primary_farm_id', resolved_farm_id,
      'survey_count', cardinality(committed_survey_ids)
    )
  ) returning id into audit_id;

  return jsonb_build_object(
    'success', true, 'auditId', audit_id, 'clientId', resolved_client_id,
    'clientCode', resolved_client_code,
    'surveyIds', to_jsonb(committed_survey_ids),
    'surveyCount', cardinality(committed_survey_ids)
  );
end
$$;

revoke all on function app_private.validate_dataset_onboarding(jsonb)
  from public, anon, authenticated;
revoke all on function public.platform_admin_preview_dataset_onboarding(jsonb)
  from public, anon;
revoke all on function public.platform_admin_commit_dataset_onboarding(jsonb)
  from public, anon;

grant execute on function public.platform_admin_preview_dataset_onboarding(jsonb)
  to authenticated;
grant execute on function public.platform_admin_commit_dataset_onboarding(jsonb)
  to authenticated;
