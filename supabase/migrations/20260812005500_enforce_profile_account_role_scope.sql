-- Enforce the approved account-level role scope after the legacy role cleanup.
-- PostgreSQL enum labels are intentionally not removed in-place, but profiles
-- may only use account-level values from this point forward.

update public.profiles
set role = 'user'
where role <> 'platform_admin';

alter table public.profiles
  drop constraint if exists profiles_role_account_scope_check;

alter table public.profiles
  add constraint profiles_role_account_scope_check
  check (role in ('platform_admin', 'user'));
