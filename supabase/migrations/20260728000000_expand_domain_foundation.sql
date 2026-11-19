-- Phase 3A draft: additive ASIMOV-HAWKS domain foundation.
--
-- This migration is intentionally compatible with the current UUID tenant
-- expand phase. It preserves legacy clients, profile roles, survey client_id,
-- routes, output relationships, and storage paths while adding reviewed domain
-- records for people, organizations, farms, memberships, grants, outputs, and
-- audit logs.

create type public.account_role as enum ('platform_admin', 'individual');
create type public.client_classification_kind as enum (
  'unclassified',
  'organization',
  'individual',
  'other'
);
create type public.membership_role as enum ('org_admin', 'member');
create type public.membership_status as enum (
  'invited',
  'pending',
  'active',
  'removed',
  'suspended'
);
create type public.domain_relationship_type as enum (
  'owner',
  'operator',
  'representative',
  'contact',
  'member',
  'requester',
  'participant',
  'legacy_client',
  'other'
);
create type public.review_status as enum (
  'pending',
  'confirmed',
  'rejected'
);
create type public.access_grant_status as enum (
  'active',
  'revoked',
  'expired'
);
create type public.output_status as enum (
  'draft',
  'ready',
  'approved',
  'published',
  'archived'
);

create table public.organization_types (
  code text primary key,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint organization_types_code_format
    check (code ~ '^[a-z0-9_]+$')
);

insert into public.organization_types (code, label, sort_order)
values
  ('cooperative', 'Cooperative', 10),
  ('association', 'Association', 20),
  ('farmer_organization', 'Farmer Organization', 30),
  ('federation', 'Federation', 40),
  ('plantation_company', 'Plantation / Company', 50),
  ('government_agency', 'Government Agency', 60),
  ('academic_institution', 'Academic Institution', 70),
  ('ngo', 'NGO', 80),
  ('private_partner', 'Private Partner', 90),
  ('other', 'Other', 100)
on conflict (code) do update
set label = excluded.label,
    sort_order = excluded.sort_order,
    is_active = true;

alter table public.clients
  add column if not exists classification_kind
    public.client_classification_kind not null default 'unclassified',
  add column if not exists classification_notes text,
  add column if not exists classification_reviewed_at timestamptz,
  add column if not exists classification_reviewed_by uuid
    references public.profiles(id);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  email text,
  mobile text,
  telephone text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  constraint people_status_check
    check (status in ('active', 'inactive', 'archived')),
  constraint people_has_name_check
    check (
      display_name is not null
      or first_name is not null
      or last_name is not null
    )
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  type_code text not null references public.organization_types(code),
  code text unique,
  name text not null,
  email text,
  telephone text,
  mobile text,
  street text,
  village text,
  barangay text,
  city text,
  province text,
  region text,
  country text,
  zip_code text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  constraint organizations_status_check
    check (status in ('active', 'inactive', 'archived'))
);

alter table public.profiles
  add column if not exists account_role public.account_role not null
    default 'individual',
  add column if not exists person_id uuid references public.people(id);

update public.profiles
set account_role = 'platform_admin'
where role = 'platform_admin';

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
    and old.role in ('viewer', 'editor')
    and new.organization_id is not distinct from old.organization_id
    and new.role in ('viewer', 'editor')
    and new.account_role = old.account_role
    and new.person_id is not distinct from old.person_id
  then
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

create table public.client_people (
  client_id uuid not null references public.clients(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  relationship_type public.domain_relationship_type not null
    default 'legacy_client',
  review_status public.review_status not null default 'pending',
  is_primary boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  primary key (client_id, person_id)
);

create table public.client_organizations (
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  relationship_type public.domain_relationship_type not null
    default 'legacy_client',
  review_status public.review_status not null default 'pending',
  is_primary boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  primary key (client_id, organization_id)
);

create unique index client_people_one_confirmed_primary_idx
  on public.client_people(client_id)
  where review_status = 'confirmed' and is_primary;

create unique index client_organizations_one_confirmed_primary_idx
  on public.client_organizations(client_id)
  where review_status = 'confirmed' and is_primary;

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  role public.membership_role not null default 'member',
  status public.membership_status not null default 'pending',
  invited_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  invited_at timestamptz,
  approved_at timestamptz,
  removed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index organization_memberships_one_live_profile_idx
  on public.organization_memberships(profile_id)
  where status in ('invited', 'pending', 'active', 'suspended');

create unique index organization_memberships_one_profile_per_org_idx
  on public.organization_memberships(profile_id, organization_id)
  where status <> 'removed';

create table public.organization_people (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  relationship_type public.domain_relationship_type not null default 'member',
  review_status public.review_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  primary key (organization_id, person_id, relationship_type)
);

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  crop text not null default 'banana',
  location_name text,
  area_hectares numeric,
  boundary_geojson jsonb,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  constraint farms_status_check
    check (status in ('active', 'inactive', 'archived')),
  constraint farms_area_nonnegative_check
    check (area_hectares is null or area_hectares >= 0)
);

create table public.farm_people (
  farm_id uuid not null references public.farms(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  relationship_type public.domain_relationship_type not null,
  review_status public.review_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  primary key (farm_id, person_id, relationship_type)
);

create table public.farm_organizations (
  farm_id uuid not null references public.farms(id) on delete cascade,
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  relationship_type public.domain_relationship_type not null,
  review_status public.review_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  primary key (farm_id, organization_id, relationship_type)
);

create table public.survey_farms (
  survey_id text not null references public.surveys(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  relationship_type public.domain_relationship_type not null
    default 'participant',
  area_covered_hectares numeric,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  primary key (survey_id, farm_id),
  constraint survey_farms_area_nonnegative_check
    check (area_covered_hectares is null or area_covered_hectares >= 0)
);

create unique index survey_farms_one_primary_per_survey_idx
  on public.survey_farms(survey_id)
  where is_primary;

create table public.survey_organizations (
  survey_id text not null references public.surveys(id) on delete cascade,
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  relationship_type public.domain_relationship_type not null
    default 'requester',
  review_status public.review_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  primary key (survey_id, organization_id, relationship_type)
);

create table public.farm_access_grants (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.access_grant_status not null default 'active',
  expires_at timestamptz,
  reason text,
  granted_by uuid references public.profiles(id),
  revoked_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index farm_access_grants_one_active_idx
  on public.farm_access_grants(farm_id, profile_id)
  where status = 'active';

create table public.survey_access_grants (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null references public.surveys(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.access_grant_status not null default 'active',
  expires_at timestamptz,
  reason text,
  granted_by uuid references public.profiles(id),
  revoked_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index survey_access_grants_one_active_idx
  on public.survey_access_grants(survey_id, profile_id)
  where status = 'active';

create table public.survey_outputs (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null references public.surveys(id) on delete cascade,
  output_type text not null,
  status public.output_status not null default 'draft',
  title text,
  description text,
  storage_bucket text,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  constraint survey_outputs_type_format
    check (output_type ~ '^[a-z0-9_]+$')
);

create unique index survey_outputs_one_current_per_type_idx
  on public.survey_outputs(survey_id, output_type)
  where is_current;

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_profile_id uuid references public.profiles(id),
  action text not null,
  table_schema text not null,
  table_name text not null,
  record_pk jsonb not null default '{}'::jsonb,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index profiles_account_role_idx
  on public.profiles(account_role);
create index profiles_person_id_idx
  on public.profiles(person_id);
create index people_name_idx
  on public.people(last_name, first_name, display_name);
create index organizations_type_code_idx
  on public.organizations(type_code);
create index organization_memberships_organization_id_idx
  on public.organization_memberships(organization_id);
create index organization_memberships_profile_id_idx
  on public.organization_memberships(profile_id);
create index organization_people_person_id_idx
  on public.organization_people(person_id);
create index farm_people_person_id_idx
  on public.farm_people(person_id);
create index farm_organizations_organization_id_idx
  on public.farm_organizations(organization_id);
create index survey_farms_farm_id_idx
  on public.survey_farms(farm_id);
create index survey_organizations_organization_id_idx
  on public.survey_organizations(organization_id);
create index farm_access_grants_profile_id_idx
  on public.farm_access_grants(profile_id);
create index survey_access_grants_profile_id_idx
  on public.survey_access_grants(profile_id);
create index survey_outputs_survey_id_idx
  on public.survey_outputs(survey_id);
create index admin_audit_log_actor_profile_id_idx
  on public.admin_audit_log(actor_profile_id);
create index admin_audit_log_occurred_at_idx
  on public.admin_audit_log(occurred_at desc);

create or replace function app_private.domain_account_role()
returns public.account_role
language sql
stable
security definer
set search_path = ''
as $$
  select profile.account_role
  from public.profiles as profile
  where profile.id = (select auth.uid())
  limit 1
$$;

create or replace function app_private.domain_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    app_private.domain_account_role() = 'platform_admin'
    or app_private.current_role() = 'platform_admin',
    false
  )
$$;

create or replace function app_private.domain_has_active_membership(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships as membership
    where membership.profile_id = (select auth.uid())
      and membership.organization_id = target_organization_id
      and membership.status = 'active'
  )
$$;

create or replace function app_private.domain_can_admin_organization(
  target_organization_id uuid
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
      from public.organization_memberships as membership
      where membership.profile_id = (select auth.uid())
        and membership.organization_id = target_organization_id
        and membership.status = 'active'
        and membership.role = 'org_admin'
    )
$$;

create or replace function app_private.domain_has_farm_grant(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.farm_access_grants as grant_row
    where grant_row.profile_id = (select auth.uid())
      and grant_row.farm_id = target_farm_id
      and grant_row.status = 'active'
      and (
        grant_row.expires_at is null
        or grant_row.expires_at > now()
      )
  )
$$;

create or replace function app_private.domain_has_organization_farm_access(
  target_farm_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.farm_organizations as farm_org
    join public.organization_memberships as membership
      on membership.organization_id = farm_org.organization_id
    where farm_org.farm_id = target_farm_id
      and farm_org.review_status = 'confirmed'
      and membership.profile_id = (select auth.uid())
      and membership.status = 'active'
  )
$$;

create or replace function app_private.domain_can_read_farm(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.domain_is_platform_admin()
    or app_private.domain_has_farm_grant(target_farm_id)
    or app_private.domain_has_organization_farm_access(target_farm_id)
$$;

create or replace function app_private.domain_has_survey_grant(
  target_survey_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.survey_access_grants as grant_row
    where grant_row.profile_id = (select auth.uid())
      and grant_row.survey_id = target_survey_id
      and grant_row.status = 'active'
      and (
        grant_row.expires_at is null
        or grant_row.expires_at > now()
      )
  )
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
        and app_private.is_my_organization(survey.client_id)
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

create or replace function app_private.domain_audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_identity jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    record_identity = jsonb_build_object('id', to_jsonb(new) -> 'id');
  elsif tg_op = 'UPDATE' then
    record_identity = jsonb_build_object('id', coalesce(
      to_jsonb(new) -> 'id',
      to_jsonb(old) -> 'id'
    ));
  else
    record_identity = jsonb_build_object('id', to_jsonb(old) -> 'id');
  end if;

  insert into public.admin_audit_log (
    actor_profile_id,
    action,
    table_schema,
    table_name,
    record_pk,
    old_data,
    new_data
  )
  values (
    auth.uid(),
    tg_op,
    tg_table_schema,
    tg_table_name,
    record_identity,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end
$$;

create or replace function app_private.enforce_organization_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() = 'service_role'
    or (
      session_user in ('postgres', 'supabase_admin')
      and auth.uid() is null
    )
    or app_private.domain_is_platform_admin()
  then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.type_code is distinct from old.type_code
    or new.code is distinct from old.code
    or new.status is distinct from old.status
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception
      'organization classification and lifecycle fields require platform admin';
  end if;

  return new;
end
$$;

revoke all on function app_private.domain_account_role()
  from public, anon;
revoke all on function app_private.domain_is_platform_admin()
  from public, anon;
revoke all on function app_private.domain_has_active_membership(uuid)
  from public, anon;
revoke all on function app_private.domain_can_admin_organization(uuid)
  from public, anon;
revoke all on function app_private.domain_has_farm_grant(uuid)
  from public, anon;
revoke all on function app_private.domain_has_organization_farm_access(uuid)
  from public, anon;
revoke all on function app_private.domain_can_read_farm(uuid)
  from public, anon;
revoke all on function app_private.domain_has_survey_grant(text)
  from public, anon;
revoke all on function app_private.domain_can_read_survey(text)
  from public, anon;
revoke all on function app_private.domain_audit_row()
  from public, anon, authenticated;
revoke all on function app_private.enforce_organization_protected_fields()
  from public, anon, authenticated;

grant execute on function app_private.domain_account_role()
  to authenticated, service_role;
grant execute on function app_private.domain_is_platform_admin()
  to authenticated, service_role;
grant execute on function app_private.domain_has_active_membership(uuid)
  to authenticated, service_role;
grant execute on function app_private.domain_can_admin_organization(uuid)
  to authenticated, service_role;
grant execute on function app_private.domain_has_farm_grant(uuid)
  to authenticated, service_role;
grant execute on function app_private.domain_has_organization_farm_access(uuid)
  to authenticated, service_role;
grant execute on function app_private.domain_can_read_farm(uuid)
  to authenticated, service_role;
grant execute on function app_private.domain_has_survey_grant(text)
  to authenticated, service_role;
grant execute on function app_private.domain_can_read_survey(text)
  to authenticated, service_role;

create trigger enforce_organization_protected_fields
before update on public.organizations
for each row execute function app_private.enforce_organization_protected_fields();

create trigger audit_clients_domain_fields
after update of classification_kind, classification_notes,
  classification_reviewed_at, classification_reviewed_by
on public.clients
for each row execute function app_private.domain_audit_row();

create trigger audit_people
after insert or update or delete on public.people
for each row execute function app_private.domain_audit_row();

create trigger audit_organizations
after insert or update or delete on public.organizations
for each row execute function app_private.domain_audit_row();

create trigger audit_organization_memberships
after insert or update or delete on public.organization_memberships
for each row execute function app_private.domain_audit_row();

create trigger audit_farms
after insert or update or delete on public.farms
for each row execute function app_private.domain_audit_row();

create trigger audit_farm_access_grants
after insert or update or delete on public.farm_access_grants
for each row execute function app_private.domain_audit_row();

create trigger audit_survey_access_grants
after insert or update or delete on public.survey_access_grants
for each row execute function app_private.domain_audit_row();

create trigger audit_survey_outputs
after insert or update or delete on public.survey_outputs
for each row execute function app_private.domain_audit_row();

alter table public.organization_types enable row level security;
alter table public.people enable row level security;
alter table public.organizations enable row level security;
alter table public.client_people enable row level security;
alter table public.client_organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_people enable row level security;
alter table public.farms enable row level security;
alter table public.farm_people enable row level security;
alter table public.farm_organizations enable row level security;
alter table public.survey_farms enable row level security;
alter table public.survey_organizations enable row level security;
alter table public.farm_access_grants enable row level security;
alter table public.survey_access_grants enable row level security;
alter table public.survey_outputs enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "authenticated users can read organization types"
on public.organization_types for select to authenticated
using (true);

create policy "platform admins manage organization types"
on public.organization_types for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read accessible people"
on public.people for select to authenticated
using (
  app_private.domain_is_platform_admin()
  or id in (
    select profile.person_id
    from public.profiles as profile
    where profile.id = (select auth.uid())
  )
  or exists (
    select 1
    from public.organization_people as org_person
    join public.organization_memberships as membership
      on membership.organization_id = org_person.organization_id
    where org_person.person_id = people.id
      and org_person.review_status = 'confirmed'
      and membership.profile_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy "platform admins manage people"
on public.people for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read accessible organizations"
on public.organizations for select to authenticated
using (
  app_private.domain_is_platform_admin()
  or app_private.domain_has_active_membership(id)
);

create policy "platform admins manage organizations"
on public.organizations for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "organization admins can update their organization"
on public.organizations for update to authenticated
using (app_private.domain_can_admin_organization(id))
with check (app_private.domain_can_admin_organization(id));

create policy "users can read confirmed client people mappings"
on public.client_people for select to authenticated
using (
  app_private.domain_is_platform_admin()
  or (
    review_status = 'confirmed'
    and person_id in (
      select profile.person_id
      from public.profiles as profile
      where profile.id = (select auth.uid())
    )
  )
);

create policy "platform admins manage client people mappings"
on public.client_people for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read confirmed client organization mappings"
on public.client_organizations for select to authenticated
using (
  app_private.domain_is_platform_admin()
  or (
    review_status = 'confirmed'
    and app_private.domain_has_active_membership(organization_id)
  )
);

create policy "platform admins manage client organization mappings"
on public.client_organizations for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read accessible memberships"
on public.organization_memberships for select to authenticated
using (
  profile_id = (select auth.uid())
  or app_private.domain_is_platform_admin()
  or app_private.domain_can_admin_organization(organization_id)
);

create policy "platform admins manage memberships"
on public.organization_memberships for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "organization admins manage ordinary members"
on public.organization_memberships for all to authenticated
using (
  app_private.domain_can_admin_organization(organization_id)
  and role = 'member'
)
with check (
  app_private.domain_can_admin_organization(organization_id)
  and role = 'member'
);

create policy "users can read accessible organization people"
on public.organization_people for select to authenticated
using (
  app_private.domain_is_platform_admin()
  or app_private.domain_has_active_membership(organization_id)
);

create policy "platform admins manage organization people"
on public.organization_people for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read accessible farms"
on public.farms for select to authenticated
using (app_private.domain_can_read_farm(id));

create policy "platform admins manage farms"
on public.farms for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read accessible farm people"
on public.farm_people for select to authenticated
using (
  app_private.domain_is_platform_admin()
  or app_private.domain_has_organization_farm_access(farm_id)
);

create policy "platform admins manage farm people"
on public.farm_people for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read accessible farm organizations"
on public.farm_organizations for select to authenticated
using (
  app_private.domain_is_platform_admin()
  or app_private.domain_has_organization_farm_access(farm_id)
);

create policy "platform admins manage farm organizations"
on public.farm_organizations for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read accessible survey farms"
on public.survey_farms for select to authenticated
using (app_private.domain_can_read_survey(survey_id));

create policy "platform admins manage survey farms"
on public.survey_farms for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read accessible survey organizations"
on public.survey_organizations for select to authenticated
using (
  app_private.domain_can_read_survey(survey_id)
  or app_private.domain_has_active_membership(organization_id)
);

create policy "platform admins manage survey organizations"
on public.survey_organizations for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read their farm grants"
on public.farm_access_grants for select to authenticated
using (
  app_private.domain_is_platform_admin()
  or profile_id = (select auth.uid())
);

create policy "platform admins manage farm grants"
on public.farm_access_grants for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read their survey grants"
on public.survey_access_grants for select to authenticated
using (
  app_private.domain_is_platform_admin()
  or profile_id = (select auth.uid())
);

create policy "platform admins manage survey grants"
on public.survey_access_grants for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "users can read accessible survey outputs"
on public.survey_outputs for select to authenticated
using (app_private.domain_can_read_survey(survey_id));

create policy "platform admins manage survey outputs"
on public.survey_outputs for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "domain access can read surveys"
on public.surveys for select to authenticated
using (app_private.domain_can_read_survey(id));

create policy "domain access can read orthos"
on public.orthos for select to authenticated
using (app_private.domain_can_read_survey(survey_id));

create policy "domain access can read point clouds"
on public.point_clouds for select to authenticated
using (app_private.domain_can_read_survey(survey_id));

create policy "platform admins read audit log"
on public.admin_audit_log for select to authenticated
using (app_private.domain_is_platform_admin());

grant select on public.organization_types, public.people,
  public.organizations, public.client_people, public.client_organizations,
  public.organization_memberships, public.organization_people, public.farms,
  public.farm_people, public.farm_organizations, public.survey_farms,
  public.survey_organizations, public.farm_access_grants,
  public.survey_access_grants, public.survey_outputs,
  public.admin_audit_log to authenticated;

grant insert, update, delete on public.organization_types, public.people,
  public.organizations, public.client_people, public.client_organizations,
  public.organization_memberships, public.organization_people, public.farms,
  public.farm_people, public.farm_organizations, public.survey_farms,
  public.survey_organizations, public.farm_access_grants,
  public.survey_access_grants, public.survey_outputs to authenticated;
