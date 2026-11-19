-- Remove active platform-admin helper dependence on profiles.account_role.
--
-- This keeps the legacy column in place for compatibility while shifting
-- RLS and protected SQL helpers to profiles.role as the only live platform
-- admin source of truth.

create or replace function app_private.domain_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    app_private.current_role() = 'platform_admin',
    false
  )
$$;