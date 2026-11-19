-- Normalize account-level roles to platform-only intent and shift client/survey
-- authorization toward organization memberships with temporary legacy-client
-- read fallback until parity checks are complete.

alter table public.profiles
  alter column role set default 'user';

update public.profiles
set role = 'user'
where role <> 'platform_admin';

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end
$$;

create or replace function app_private.domain_has_legacy_client_access(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    target_client_id = app_private.current_organization_id(),
    false
  )
$$;

create or replace function app_private.domain_has_client_membership_access(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.client_organizations as mapping
    join public.organization_memberships as membership
      on membership.organization_id = mapping.organization_id
    where mapping.client_id = target_client_id
      and mapping.review_status = 'confirmed'
      and membership.profile_id = (select auth.uid())
      and membership.status = 'active'
  )
$$;

create or replace function app_private.domain_has_client_access(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.domain_is_platform_admin()
    or app_private.domain_has_client_membership_access(target_client_id)
    or app_private.domain_has_legacy_client_access(target_client_id)
$$;

create or replace function app_private.domain_can_edit_client(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.domain_is_platform_admin()
    or exists (
      select 1
      from public.client_organizations as mapping
      join public.organization_memberships as membership
        on membership.organization_id = mapping.organization_id
      where mapping.client_id = target_client_id
        and mapping.review_status = 'confirmed'
        and membership.profile_id = (select auth.uid())
        and membership.status = 'active'
        and membership.role in ('org_admin', 'editor')
    )
$$;

create or replace function app_private.domain_can_admin_client(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.domain_is_platform_admin()
    or exists (
      select 1
      from public.client_organizations as mapping
      join public.organization_memberships as membership
        on membership.organization_id = mapping.organization_id
      where mapping.client_id = target_client_id
        and mapping.review_status = 'confirmed'
        and membership.profile_id = (select auth.uid())
        and membership.status = 'active'
        and membership.role = 'org_admin'
    )
$$;

create or replace function app_private.is_my_organization(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.domain_has_client_access(target_id)
$$;

create or replace function app_private.can_edit_organization(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.domain_can_edit_client(target_id)
$$;

create or replace function app_private.can_admin_organization(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.domain_can_admin_client(target_id)
$$;

create or replace function app_private.domain_can_read_survey(
  target_survey_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.domain_is_platform_admin()
    or exists (
      select 1
      from public.surveys as survey
      where survey.id = target_survey_id
        and app_private.domain_has_client_access(survey.client_id)
    )
    or exists (
      select 1
      from public.survey_organizations as survey_org
      join public.organization_memberships as membership
        on membership.organization_id = survey_org.organization_id
      where survey_org.survey_id = target_survey_id
        and survey_org.review_status = 'confirmed'
        and membership.profile_id = (select auth.uid())
        and membership.status = 'active'
    )
    or app_private.domain_has_survey_grant(target_survey_id)
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
    and new.organization_id is not distinct from old.organization_id
    and new.role = old.role
    and new.account_role = old.account_role
    and new.person_id is not distinct from old.person_id
  then
    return new;
  end if;

  raise exception
    'role, organization, account role, and person-link changes are not permitted';
end
$$;

revoke all on function app_private.domain_has_legacy_client_access(uuid)
  from public, anon;
revoke all on function app_private.domain_has_client_membership_access(uuid)
  from public, anon;
revoke all on function app_private.domain_has_client_access(uuid)
  from public, anon;
revoke all on function app_private.domain_can_edit_client(uuid)
  from public, anon;
revoke all on function app_private.domain_can_admin_client(uuid)
  from public, anon;

grant execute on function app_private.domain_has_legacy_client_access(uuid)
  to authenticated, service_role;
grant execute on function app_private.domain_has_client_membership_access(uuid)
  to authenticated, service_role;
grant execute on function app_private.domain_has_client_access(uuid)
  to authenticated, service_role;
grant execute on function app_private.domain_can_edit_client(uuid)
  to authenticated, service_role;
grant execute on function app_private.domain_can_admin_client(uuid)
  to authenticated, service_role;

drop policy if exists "users can read accessible profiles" on public.profiles;
drop policy if exists "users can update permitted profiles" on public.profiles;

create policy "users can read accessible profiles"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or app_private.domain_is_platform_admin()
  or exists (
    select 1
    from public.organization_memberships as caller_membership
    join public.organization_memberships as target_membership
      on target_membership.organization_id = caller_membership.organization_id
    where caller_membership.profile_id = (select auth.uid())
      and caller_membership.status = 'active'
      and caller_membership.role = 'org_admin'
      and target_membership.profile_id = profiles.id
      and target_membership.status in ('invited', 'pending', 'active', 'suspended')
  )
  or exists (
    select 1
    from public.organization_memberships as caller_membership
    join public.client_organizations as mapping
      on mapping.organization_id = caller_membership.organization_id
    where caller_membership.profile_id = (select auth.uid())
      and caller_membership.status = 'active'
      and caller_membership.role = 'org_admin'
      and mapping.review_status = 'confirmed'
      and mapping.client_id = profiles.organization_id
  )
);

create policy "users can update permitted profiles"
on public.profiles for update to authenticated
using (
  id = (select auth.uid())
  or app_private.domain_is_platform_admin()
)
with check (
  id = (select auth.uid())
  or app_private.domain_is_platform_admin()
);