-- Phase 3G-C: create canonical records and map mixed legacy clients.
--
-- These functions create only the minimal canonical person/organization records
-- needed for the classification workflow, then reuse the Phase 3G-B checked
-- mapping RPCs in the same transaction. They do not create memberships, farms,
-- grants, outputs, assets, or destructive workflows.

create or replace function public.admin_create_organization_for_client_mapping(
  target_client_id uuid,
  organization_name text,
  organization_type_code text,
  organization_code text default null,
  organization_notes text default null,
  mapping_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_organization_id uuid;
begin
  if not app_private.domain_is_platform_admin() then
    raise exception 'only platform admins can create mapped organizations'
      using errcode = '42501';
  end if;

  if nullif(btrim(organization_name), '') is null then
    raise exception 'organization name is required'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.organization_types
    where code = organization_type_code
      and is_active
  ) then
    raise exception 'active organization type not found'
      using errcode = 'P0002';
  end if;

  insert into public.organizations (
    name,
    type_code,
    code,
    notes,
    created_by
  )
  values (
    left(btrim(organization_name), 200),
    organization_type_code,
    nullif(upper(left(btrim(coalesce(organization_code, '')), 80)), ''),
    nullif(left(btrim(coalesce(organization_notes, '')), 2000), ''),
    auth.uid()
  )
  returning id into created_organization_id;

  perform public.admin_confirm_client_organization_mapping(
    target_client_id,
    created_organization_id,
    mapping_notes
  );

  return created_organization_id;
end
$$;

create or replace function public.admin_create_person_for_client_mapping(
  target_client_id uuid,
  person_display_name text,
  person_first_name text default null,
  person_last_name text default null,
  person_mobile text default null,
  person_notes text default null,
  mapping_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_person_id uuid;
begin
  if not app_private.domain_is_platform_admin() then
    raise exception 'only platform admins can create mapped people'
      using errcode = '42501';
  end if;

  if nullif(btrim(person_display_name), '') is null
    and nullif(btrim(coalesce(person_first_name, '')), '') is null
    and nullif(btrim(coalesce(person_last_name, '')), '') is null
  then
    raise exception 'person name is required'
      using errcode = '23514';
  end if;

  insert into public.people (
    display_name,
    first_name,
    last_name,
    mobile,
    notes,
    created_by
  )
  values (
    nullif(left(btrim(coalesce(person_display_name, '')), 200), ''),
    nullif(left(btrim(coalesce(person_first_name, '')), 120), ''),
    nullif(left(btrim(coalesce(person_last_name, '')), 120), ''),
    nullif(left(btrim(coalesce(person_mobile, '')), 80), ''),
    nullif(left(btrim(coalesce(person_notes, '')), 2000), ''),
    auth.uid()
  )
  returning id into created_person_id;

  perform public.admin_confirm_client_person_mapping(
    target_client_id,
    created_person_id,
    mapping_notes
  );

  return created_person_id;
end
$$;

revoke all on function public.admin_create_organization_for_client_mapping(
  uuid,
  text,
  text,
  text,
  text,
  text
) from public, anon;
revoke all on function public.admin_create_person_for_client_mapping(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon;

grant execute on function public.admin_create_organization_for_client_mapping(
  uuid,
  text,
  text,
  text,
  text,
  text
) to authenticated;
grant execute on function public.admin_create_person_for_client_mapping(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;
