create schema if not exists app_private;

revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated, service_role;

create or replace function app_private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.profiles as profile
  where profile.id = (select auth.uid())
  limit 1
$$;

create or replace function app_private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profile.organization_id
  from public.profiles as profile
  where profile.id = (select auth.uid())
  limit 1
$$;

create or replace function app_private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app_private.current_role() = 'platform_admin', false)
$$;

create or replace function app_private.is_my_organization(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    target_id = app_private.current_organization_id(),
    false
  )
$$;

create or replace function app_private.can_edit_organization(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.is_platform_admin()
    or (
      app_private.current_role() in ('org_admin', 'editor')
      and app_private.is_my_organization(target_id)
    )
$$;

create or replace function app_private.can_admin_organization(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.is_platform_admin()
    or (
      app_private.current_role() = 'org_admin'
      and app_private.is_my_organization(target_id)
    )
$$;

create or replace function app_private.survey_organization_id(target_survey_id text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select survey.client_id
  from public.surveys as survey
  where survey.id = target_survey_id
  limit 1
$$;

revoke all on all functions in schema app_private from public, anon;
grant execute on function app_private.current_role() to authenticated, service_role;
grant execute on function app_private.current_organization_id() to authenticated, service_role;
grant execute on function app_private.is_platform_admin() to authenticated, service_role;
grant execute on function app_private.is_my_organization(uuid) to authenticated, service_role;
grant execute on function app_private.can_edit_organization(uuid) to authenticated, service_role;
grant execute on function app_private.can_admin_organization(uuid) to authenticated, service_role;
grant execute on function app_private.survey_organization_id(text) to authenticated, service_role;

create or replace function app_private.enforce_profile_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_role public.app_role;
  caller_organization_id uuid;
begin
  if auth.role() = 'service_role'
    or (
      session_user in ('postgres', 'supabase_admin')
      and auth.uid() is null
    )
  then
    return new;
  end if;

  select profile.role, profile.organization_id
  into caller_role, caller_organization_id
  from public.profiles as profile
  where profile.id = caller_id;

  if caller_role = 'platform_admin' then
    return new;
  end if;

  if caller_role = 'org_admin'
    and old.organization_id = caller_organization_id
    and old.role <> 'platform_admin'
    and new.organization_id is not distinct from old.organization_id
    and new.role <> 'platform_admin'
  then
    return new;
  end if;

  if old.id = caller_id
    and new.organization_id is not distinct from old.organization_id
    and new.role = old.role
  then
    return new;
  end if;

  raise exception 'role and organization changes are not permitted';
end
$$;

revoke all on function app_private.enforce_profile_protected_fields()
  from public, anon, authenticated;

drop trigger if exists enforce_profile_protected_fields on public.profiles;
create trigger enforce_profile_protected_fields
before update on public.profiles
for each row execute function app_private.enforce_profile_protected_fields();

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

revoke all on function app_private.set_updated_at()
  from public, anon, authenticated;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function app_private.set_updated_at();

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
    'viewer'
  )
  on conflict (id) do nothing;

  return new;
end
$$;

revoke all on function app_private.handle_new_user()
  from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

create or replace function app_private.set_survey_created_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is null and auth.uid() is not null then
    new.created_by = auth.uid();
  end if;
  return new;
end
$$;

revoke all on function app_private.set_survey_created_by()
  from public, anon, authenticated;

drop trigger if exists set_survey_created_by on public.surveys;
create trigger set_survey_created_by
before insert on public.surveys
for each row execute function app_private.set_survey_created_by();

drop policy if exists "admins can delete clients" on public.clients;
drop policy if exists "admins can insert clients" on public.clients;
drop policy if exists "admins can update clients" on public.clients;
drop policy if exists "users can read their client" on public.clients;

create policy "tenant users can read accessible clients"
on public.clients for select to authenticated
using (
  app_private.is_platform_admin()
  or app_private.is_my_organization(id)
);

create policy "platform admins can insert clients"
on public.clients for insert to authenticated
with check (app_private.is_platform_admin());

create policy "platform admins can update clients"
on public.clients for update to authenticated
using (app_private.is_platform_admin())
with check (app_private.is_platform_admin());

create policy "platform admins can delete clients"
on public.clients for delete to authenticated
using (app_private.is_platform_admin());

drop policy if exists "admins can update all profiles" on public.profiles;
drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "users can update own profile safely" on public.profiles;

create policy "users can read accessible profiles"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or app_private.is_platform_admin()
  or (
    app_private.current_role() = 'org_admin'
    and app_private.is_my_organization(organization_id)
  )
);

create policy "users can update permitted profiles"
on public.profiles for update to authenticated
using (
  id = (select auth.uid())
  or app_private.is_platform_admin()
  or (
    app_private.current_role() = 'org_admin'
    and app_private.is_my_organization(organization_id)
    and role <> 'platform_admin'
  )
)
with check (
  id = (select auth.uid())
  or app_private.is_platform_admin()
  or (
    app_private.current_role() = 'org_admin'
    and app_private.is_my_organization(organization_id)
    and role <> 'platform_admin'
  )
);

create policy "platform admins can delete profiles"
on public.profiles for delete to authenticated
using (app_private.is_platform_admin());

drop policy if exists "admins can delete surveys" on public.surveys;
drop policy if exists "editors or admins can insert surveys" on public.surveys;
drop policy if exists "editors or admins can update surveys" on public.surveys;
drop policy if exists "users can read surveys in org" on public.surveys;

create policy "users can read surveys in their organization"
on public.surveys for select to authenticated
using (
  app_private.is_platform_admin()
  or app_private.is_my_organization(client_id)
);

create policy "editors can insert surveys in their organization"
on public.surveys for insert to authenticated
with check (app_private.can_edit_organization(client_id));

create policy "editors can update surveys in their organization"
on public.surveys for update to authenticated
using (app_private.can_edit_organization(client_id))
with check (app_private.can_edit_organization(client_id));

create policy "organization admins can delete surveys"
on public.surveys for delete to authenticated
using (app_private.can_admin_organization(client_id));

drop policy if exists "admins can delete orthos" on public.orthos;
drop policy if exists "editors or admins can insert orthos" on public.orthos;
drop policy if exists "editors or admins can update orthos" on public.orthos;
drop policy if exists "users can read orthos in org" on public.orthos;

create policy "users can read orthos in their organization"
on public.orthos for select to authenticated
using (
  app_private.is_platform_admin()
  or app_private.is_my_organization(
    app_private.survey_organization_id(survey_id)
  )
);

create policy "editors can insert orthos in their organization"
on public.orthos for insert to authenticated
with check (
  app_private.can_edit_organization(
    app_private.survey_organization_id(survey_id)
  )
);

create policy "editors can update orthos in their organization"
on public.orthos for update to authenticated
using (
  app_private.can_edit_organization(
    app_private.survey_organization_id(survey_id)
  )
)
with check (
  app_private.can_edit_organization(
    app_private.survey_organization_id(survey_id)
  )
);

create policy "organization admins can delete orthos"
on public.orthos for delete to authenticated
using (
  app_private.can_admin_organization(
    app_private.survey_organization_id(survey_id)
  )
);

drop policy if exists "admins can delete point clouds" on public.point_clouds;
drop policy if exists "editors or admins can insert point clouds" on public.point_clouds;
drop policy if exists "editors or admins can update point clouds" on public.point_clouds;
drop policy if exists "users can read point clouds in org" on public.point_clouds;

create policy "users can read point clouds in their organization"
on public.point_clouds for select to authenticated
using (
  app_private.is_platform_admin()
  or app_private.is_my_organization(
    app_private.survey_organization_id(survey_id)
  )
);

create policy "editors can insert point clouds in their organization"
on public.point_clouds for insert to authenticated
with check (
  app_private.can_edit_organization(
    app_private.survey_organization_id(survey_id)
  )
);

create policy "editors can update point clouds in their organization"
on public.point_clouds for update to authenticated
using (
  app_private.can_edit_organization(
    app_private.survey_organization_id(survey_id)
  )
)
with check (
  app_private.can_edit_organization(
    app_private.survey_organization_id(survey_id)
  )
);

create policy "organization admins can delete point clouds"
on public.point_clouds for delete to authenticated
using (
  app_private.can_admin_organization(
    app_private.survey_organization_id(survey_id)
  )
);

revoke all on all tables in schema public from anon;
grant select on public.clients, public.profiles, public.surveys,
  public.orthos, public.point_clouds to authenticated;
grant insert, update, delete on public.clients, public.profiles,
  public.surveys, public.orthos, public.point_clouds to authenticated;

drop function if exists public.get_my_organization_id();
drop function if exists public.get_my_role();
drop function if exists public.is_admin();
drop function if exists public.is_editor_or_admin();
drop function if exists public.is_my_organization(text);
drop function if exists public.is_survey_in_my_org(text);
drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();

do $$
begin
  if exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    drop event trigger ensure_rls;
  end if;
end
$$;

drop function if exists public.rls_auto_enable();

create or replace function app_private.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  command record;
begin
  for command in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if command.schema_name = 'public' then
      execute format(
        'alter table if exists %s enable row level security',
        command.object_identity
      );
    end if;
  end loop;
end
$$;

revoke all on function app_private.rls_auto_enable()
  from public, anon, authenticated;

create event trigger ensure_rls
on ddl_command_end
when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
execute function app_private.rls_auto_enable();

