-- Add the UUID tenant model while preserving every legacy column needed by the
-- currently deployed application.

alter table public.clients
  add column if not exists id uuid not null default gen_random_uuid();

create unique index if not exists clients_id_key on public.clients(id);

alter table public.profiles
  add column if not exists organization_id uuid;

alter table public.surveys
  add column if not exists client_id uuid;

do $$
begin
  if exists (
    select 1
    from public.profiles
    where organization is distinct from access_code
      and organization is not null
      and access_code is not null
  ) then
    raise exception
      'profiles.organization and profiles.access_code disagree; UUID backfill aborted';
  end if;

  if exists (
    select 1
    from public.surveys
    where access_code is distinct from code
  ) then
    raise exception
      'surveys.access_code and surveys.code disagree; UUID backfill aborted';
  end if;

  if exists (
    select 1
    from public.surveys
    where organization_code is not null
      and organization_code is distinct from code
  ) then
    raise exception
      'surveys.organization_code and surveys.code disagree; UUID backfill aborted';
  end if;
end
$$;

update public.profiles as profile
set organization_id = client.id
from public.clients as client
where client.code = coalesce(profile.organization, profile.access_code)
  and profile.organization_id is null;

update public.surveys as survey
set client_id = client.id
from public.clients as client
where client.code = survey.code
  and survey.client_id is null;

do $$
begin
  if exists (
    select 1
    from public.profiles
    where coalesce(organization, access_code) is not null
      and organization_id is null
  ) then
    raise exception 'one or more assigned profiles could not be mapped to clients.id';
  end if;

  if exists (
    select 1
    from public.surveys
    where client_id is null
  ) then
    raise exception 'one or more surveys could not be mapped to clients.id';
  end if;
end
$$;

alter table public.profiles
  add constraint profiles_organization_id_fkey
    foreign key (organization_id) references public.clients(id);

alter table public.surveys
  add constraint surveys_client_id_fkey
    foreign key (client_id) references public.clients(id);

create index if not exists profiles_organization_id_idx
  on public.profiles(organization_id);
create index if not exists surveys_client_id_idx
  on public.surveys(client_id);
create index if not exists surveys_created_by_idx
  on public.surveys(created_by);
create index if not exists orthos_survey_id_idx
  on public.orthos(survey_id);
create index if not exists point_clouds_survey_id_idx
  on public.point_clouds(survey_id);

update public.surveys
set status = 'completed'
where status = 'draft'
  and created_by is null;

do $$
begin
  if exists (
    select 1
    from pg_enum enum_value
    join pg_type enum_type on enum_type.oid = enum_value.enumtypid
    join pg_namespace enum_schema on enum_schema.oid = enum_type.typnamespace
    where enum_schema.nspname = 'public'
      and enum_type.typname = 'app_role'
      and enum_value.enumlabel = 'admin'
  ) and not exists (
    select 1
    from pg_enum enum_value
    join pg_type enum_type on enum_type.oid = enum_value.enumtypid
    join pg_namespace enum_schema on enum_schema.oid = enum_type.typnamespace
    where enum_schema.nspname = 'public'
      and enum_type.typname = 'app_role'
      and enum_value.enumlabel = 'platform_admin'
  ) then
    alter type public.app_role rename value 'admin' to 'platform_admin';
  end if;
end
$$;

alter type public.app_role add value if not exists 'org_admin' after 'platform_admin';

