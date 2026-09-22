-- Read-only aggregate inventory for the survey identity/client-field contract.
-- This emits no survey identifiers, client names, or asset paths.

select jsonb_build_object(
  'survey_count', count(*),
  'null_code', count(*) filter (where code is null),
  'null_access_code', count(*) filter (where access_code is null),
  'null_organization_code', count(*) filter (where organization_code is null),
  'null_client_id', count(*) filter (where client_id is null),
  'code_access_code_mismatch', count(*) filter (where access_code is distinct from code),
  'code_organization_code_mismatch', count(*) filter (
    where organization_code is not null and organization_code is distinct from code
  ),
  'missing_client_reference', count(*) filter (
    where client_id is not null
      and not exists (
        select 1 from public.clients where clients.id = surveys.client_id
      )
  )
) as survey_identity_inventory
from public.surveys;

select jsonb_build_object(
  'duplicate_non_null_codes', count(*)
) as survey_duplicate_inventory
from (
  select code
  from public.surveys
  where code is not null
  group by code
  having count(*) > 1
) duplicate_codes;

select jsonb_build_object(
  'ortho_pointer_mismatches', count(*) filter (
    where survey.ortho is distinct from current_ortho.id
  ),
  'point_cloud_pointer_mismatches', count(*) filter (
    where survey.point_cloud is distinct from current_point_cloud.code
  )
) as survey_output_pointer_inventory
from public.surveys survey
left join public.orthos current_ortho
  on current_ortho.survey_id = survey.id and current_ortho.is_current
left join public.point_clouds current_point_cloud
  on current_point_cloud.survey_id = survey.id and current_point_cloud.is_current;

select jsonb_build_object(
  'authenticated_can_update_surveys',
  has_table_privilege('authenticated', 'public.surveys', 'UPDATE'),
  'contract_rpc_exists',
  to_regprocedure(
    'public.platform_admin_update_survey(text,text,date,numeric,text,text,text,public.mission_status)'
  ) is not null,
  'authenticated_can_execute_contract_rpc',
  case
    when to_regprocedure(
      'public.platform_admin_update_survey(text,text,date,numeric,text,text,text,public.mission_status)'
    ) is null then false
    else has_function_privilege(
      'authenticated',
      to_regprocedure(
        'public.platform_admin_update_survey(text,text,date,numeric,text,text,text,public.mission_status)'
      ),
      'EXECUTE'
    )
  end
) as survey_update_contract;
