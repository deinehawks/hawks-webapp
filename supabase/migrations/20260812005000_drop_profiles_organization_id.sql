-- Remove legacy profile-owned client assignment now that memberships and grants
-- are the only live access paths.

create or replace function app_private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select null::uuid
$$;

create or replace function app_private.enforce_profile_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if auth.role() = 'service_role'
    or (
      session_user in ('postgres', 'supabase_admin')
      and auth.uid() is null
    )
  then
    return new;
  end if;

  if app_private.domain_is_platform_admin() then
    return new;
  end if;

  if old.id = caller_id
    and new.role = old.role
    and new.person_id is not distinct from old.person_id
  then
    return new;
  end if;

  raise exception
    'role and person-link changes are not permitted';
end
$$;

alter table public.profiles
  drop constraint if exists profiles_organization_id_fkey;

drop index if exists public.profiles_organization_id_idx;

alter table public.profiles
  drop column if exists organization_id;
