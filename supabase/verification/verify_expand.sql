select
  count(*) filter (where id is null) as clients_without_uuid,
  count(*) filter (where code is null) as clients_without_code
from public.clients;

select
  count(*) filter (
    where coalesce(organization, access_code) is not null
      and organization_id is null
  ) as assigned_profiles_without_uuid,
  count(*) filter (
    where coalesce(organization, access_code) is null
      and organization_id is null
  ) as pending_profiles
from public.profiles;

select
  count(*) filter (where client_id is null) as surveys_without_uuid,
  count(*) filter (where access_code is distinct from code)
    as legacy_code_mismatches,
  count(*) filter (where status = 'draft' and created_by is null)
    as unclassified_legacy_surveys
from public.surveys;

select
  count(*) filter (where survey.ortho is distinct from ortho.id)
    as ortho_pointer_mismatches,
  count(*) filter (
    where survey.point_cloud is distinct from point_cloud.code
  ) as point_cloud_pointer_mismatches
from public.surveys as survey
left join public.orthos as ortho
  on ortho.survey_id = survey.id and ortho.is_current
left join public.point_clouds as point_cloud
  on point_cloud.survey_id = survey.id and point_cloud.is_current;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select routine_schema, routine_name, security_type
from information_schema.routines
where routine_schema in ('public', 'app_private')
order by routine_schema, routine_name;

