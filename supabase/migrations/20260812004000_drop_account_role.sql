-- Finalize account_role removal now that live helpers and app code no longer
-- depend on it.

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
    and new.organization_id is not distinct from old.organization_id
    and new.role = old.role
    and new.person_id is not distinct from old.person_id
  then
    return new;
  end if;

  raise exception
    'role, organization, and person-link changes are not permitted';
end
$$;

drop function if exists app_private.domain_account_role();

drop index if exists public.profiles_account_role_idx;

alter table public.profiles
  drop column if exists account_role;

drop type if exists public.account_role;
