-- DEFERRED CONTRACT MIGRATION.
-- Move this file into supabase/migrations with a new timestamp only after the
-- compatible application and private UUID storage paths pass acceptance tests.

-- This contract only removes legacy text compatibility columns. It must not
-- reintroduce `profiles.organization_id` as a required authorization source.

do $$
begin
  if exists (select 1 from public.surveys where client_id is null) then
    raise exception 'cannot contract: surveys.client_id contains null values';
  end if;

  if exists (
    select 1
    from public.surveys as survey
    left join public.orthos as ortho
      on ortho.survey_id = survey.id and ortho.is_current
    where survey.ortho is distinct from ortho.id
  ) then
    raise exception 'cannot contract: current ortho pointers do not match';
  end if;

  if exists (
    select 1
    from public.surveys as survey
    left join public.point_clouds as point_cloud
      on point_cloud.survey_id = survey.id and point_cloud.is_current
    where survey.point_cloud is distinct from point_cloud.code
  ) then
    raise exception 'cannot contract: current point-cloud pointers do not match';
  end if;
end
$$;

alter table public.clients
  add constraint clients_code_key unique (code);

alter table public.profiles
  drop constraint profiles_organization_fkey,
  drop column access_code,
  drop column organization;

alter table public.surveys
  drop constraint surveys_organization_code_fkey,
  drop constraint surveys_ortho_fkey,
  drop constraint surveys_point_cloud_fkey,
  drop column access_code,
  drop column organization_code,
  drop column code,
  drop column ortho,
  drop column point_cloud;

alter table public.clients
  drop constraint clients_pkey,
  add constraint clients_pkey primary key (id);

drop index if exists public.clients_id_key;
drop index if exists public.surveys_id_key;

alter table public.surveys
  alter column client_id set not null;
