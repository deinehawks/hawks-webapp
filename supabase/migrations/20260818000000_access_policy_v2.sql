-- Access Policy v2: two organization roles, grant-scoped member access,
-- platform-approved signup, and organization onboarding requests.

drop policy if exists "organization admins manage ordinary members"
on public.organization_memberships;

drop policy if exists "users can read accessible profiles"
on public.profiles;

alter table public.organization_memberships
  alter column role drop default;

update public.organization_memberships
set role = 'member'
where role in ('viewer', 'editor');

alter type public.membership_role rename to membership_role_access_v1;

create type public.membership_role as enum ('org_admin', 'member');

alter table public.organization_memberships
  alter column role type public.membership_role
  using role::text::public.membership_role,
  alter column role set default 'member';

alter table public.farm_access_grants
  add column organization_id uuid references public.organizations(id);

alter table public.survey_access_grants
  add column organization_id uuid references public.organizations(id);

create index farm_access_grants_organization_id_idx
  on public.farm_access_grants(organization_id)
  where organization_id is not null;

create index survey_access_grants_organization_id_idx
  on public.survey_access_grants(organization_id)
  where organization_id is not null;

create or replace function app_private.revoke_removed_membership_grants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from 'removed' and new.status = 'removed' then
    update public.farm_access_grants
    set status = 'revoked',
        revoked_by = auth.uid(),
        updated_at = now()
    where profile_id = new.profile_id
      and organization_id = new.organization_id
      and status = 'active';

    update public.survey_access_grants
    set status = 'revoked',
        revoked_by = auth.uid(),
        updated_at = now()
    where profile_id = new.profile_id
      and organization_id = new.organization_id
      and status = 'active';
  end if;

  return new;
end
$$;

create trigger revoke_removed_membership_grants
after update of status on public.organization_memberships
for each row execute function app_private.revoke_removed_membership_grants();

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
    join public.organizations as organization
      on organization.id = membership.organization_id
    where membership.profile_id = (select auth.uid())
      and membership.organization_id = target_organization_id
      and membership.status = 'active'
      and organization.status = 'active'
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
      join public.organizations as organization
        on organization.id = membership.organization_id
      where membership.profile_id = (select auth.uid())
        and membership.organization_id = target_organization_id
        and membership.status = 'active'
        and membership.role = 'org_admin'
        and organization.status = 'active'
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
    join public.organizations as organization
      on organization.id = membership.organization_id
    where mapping.client_id = target_client_id
      and mapping.review_status = 'confirmed'
      and membership.profile_id = (select auth.uid())
      and membership.status = 'active'
      and organization.status = 'active'
  )
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
      join public.organizations as organization
        on organization.id = membership.organization_id
      where mapping.client_id = target_client_id
        and mapping.review_status = 'confirmed'
        and membership.profile_id = (select auth.uid())
        and membership.status = 'active'
        and membership.role = 'org_admin'
        and organization.status = 'active'
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
  select app_private.domain_can_edit_client(target_client_id)
$$;

create or replace function app_private.domain_has_farm_grant(
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
    from public.farm_access_grants as grant_row
    where grant_row.profile_id = (select auth.uid())
      and grant_row.farm_id = target_farm_id
      and grant_row.status = 'active'
      and (grant_row.expires_at is null or grant_row.expires_at > now())
      and (
        grant_row.organization_id is null
        or exists (
          select 1
          from public.organization_memberships as membership
          join public.organizations as organization
            on organization.id = membership.organization_id
          join public.farm_organizations as farm_org
            on farm_org.organization_id = membership.organization_id
           and farm_org.farm_id = grant_row.farm_id
          where membership.profile_id = grant_row.profile_id
            and membership.organization_id = grant_row.organization_id
            and membership.status = 'active'
            and organization.status = 'active'
            and farm_org.review_status = 'confirmed'
        )
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
    join public.organizations as organization
      on organization.id = membership.organization_id
    where farm_org.farm_id = target_farm_id
      and farm_org.review_status = 'confirmed'
      and membership.profile_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role = 'org_admin'
      and organization.status = 'active'
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
      and (grant_row.expires_at is null or grant_row.expires_at > now())
      and (
        grant_row.organization_id is null
        or exists (
          select 1
          from public.organization_memberships as membership
          join public.organizations as organization
            on organization.id = membership.organization_id
          join public.survey_organizations as survey_org
            on survey_org.organization_id = membership.organization_id
           and survey_org.survey_id = grant_row.survey_id
          where membership.profile_id = grant_row.profile_id
            and membership.organization_id = grant_row.organization_id
            and membership.status = 'active'
            and organization.status = 'active'
            and survey_org.review_status = 'confirmed'
        )
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
        and app_private.domain_can_admin_client(survey.client_id)
    )
    or exists (
      select 1
      from public.survey_organizations as survey_org
      where survey_org.survey_id = target_survey_id
        and survey_org.review_status = 'confirmed'
        and app_private.domain_can_admin_organization(survey_org.organization_id)
    )
    or app_private.domain_has_survey_grant(target_survey_id)
$$;

-- Remove permissive UUID-era policies. PostgreSQL combines permissive policies
-- with OR, so leaving these in place would bypass grant-only member access and
-- retain broad survey/asset mutations for legacy editor-style roles.
drop policy if exists "users can read surveys in their organization"
  on public.surveys;
drop policy if exists "editors can insert surveys in their organization"
  on public.surveys;
drop policy if exists "editors can update surveys in their organization"
  on public.surveys;
drop policy if exists "organization admins can delete surveys"
  on public.surveys;

drop policy if exists "users can read orthos in their organization"
  on public.orthos;
drop policy if exists "editors can insert orthos in their organization"
  on public.orthos;
drop policy if exists "editors can update orthos in their organization"
  on public.orthos;
drop policy if exists "organization admins can delete orthos"
  on public.orthos;

drop policy if exists "users can read point clouds in their organization"
  on public.point_clouds;
drop policy if exists "editors can insert point clouds in their organization"
  on public.point_clouds;
drop policy if exists "editors can update point clouds in their organization"
  on public.point_clouds;
drop policy if exists "organization admins can delete point clouds"
  on public.point_clouds;

drop policy if exists "platform admins manage surveys" on public.surveys;
create policy "platform admins manage surveys"
on public.surveys for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

drop policy if exists "platform admins manage orthos" on public.orthos;
create policy "platform admins manage orthos"
on public.orthos for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

drop policy if exists "platform admins manage point clouds"
  on public.point_clouds;
create policy "platform admins manage point clouds"
on public.point_clouds for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

drop policy if exists "users can read accessible survey organizations"
  on public.survey_organizations;
create policy "users can read accessible survey organizations"
on public.survey_organizations for select to authenticated
using (app_private.domain_can_read_survey(survey_id));

-- Organization-admin edits will be exposed through narrow audited functions in
-- the organization-admin slice. Retaining this broad table policy would allow
-- every unprotected column to be mutated directly.
drop policy if exists "organization admins can update their organization"
  on public.organizations;

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
    join public.organizations as organization
      on organization.id = caller_membership.organization_id
    where caller_membership.profile_id = (select auth.uid())
      and caller_membership.status = 'active'
      and caller_membership.role = 'org_admin'
      and organization.status = 'active'
      and target_membership.profile_id = profiles.id
      and target_membership.status in ('invited', 'pending', 'active', 'suspended')
  )
);

drop type public.membership_role_access_v1;

create table public.account_signup_approvals (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  organization_id uuid not null references public.organizations(id),
  initial_role public.membership_role not null default 'member',
  status text not null default 'approved',
  expires_at timestamptz not null default (now() + interval '7 days'),
  approved_by uuid not null references public.profiles(id),
  registered_profile_id uuid references public.profiles(id),
  claimed_at timestamptz,
  revoked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_signup_approvals_email_normalized_check
    check (email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
  constraint account_signup_approvals_status_check
    check (status in ('approved', 'registered', 'claimed', 'revoked', 'expired')),
  constraint account_signup_approvals_expiry_check
    check (expires_at > created_at)
);

create unique index account_signup_approvals_one_open_email_idx
  on public.account_signup_approvals(lower(email))
  where status in ('approved', 'registered');

create table public.organization_user_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  requested_email text not null,
  requested_name text,
  notes text,
  status text not null default 'pending',
  requested_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_user_requests_email_normalized_check
    check (requested_email = lower(btrim(requested_email)) and requested_email ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
  constraint organization_user_requests_status_check
    check (status in ('pending', 'approved', 'rejected', 'cancelled'))
);

alter table public.account_signup_approvals enable row level security;
alter table public.organization_user_requests enable row level security;

create policy "platform admins manage signup approvals"
on public.account_signup_approvals for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "platform admins manage onboarding requests"
on public.organization_user_requests for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "organization admins read their onboarding requests"
on public.organization_user_requests for select to authenticated
using (app_private.domain_can_admin_organization(organization_id));

create policy "organization admins create their onboarding requests"
on public.organization_user_requests for insert to authenticated
with check (
  app_private.domain_can_admin_organization(organization_id)
  and requested_by = (select auth.uid())
  and status = 'pending'
);

create policy "organization admins cancel their onboarding requests"
on public.organization_user_requests for update to authenticated
using (
  app_private.domain_can_admin_organization(organization_id)
  and requested_by = (select auth.uid())
  and status = 'pending'
)
with check (
  app_private.domain_can_admin_organization(organization_id)
  and requested_by = (select auth.uid())
  and status = 'cancelled'
);

create or replace function app_private.enforce_organization_user_request_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.domain_is_platform_admin() and (
    new.organization_id is distinct from old.organization_id
    or new.requested_email is distinct from old.requested_email
    or new.requested_name is distinct from old.requested_name
    or new.notes is distinct from old.notes
    or new.requested_by is distinct from old.requested_by
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.created_at is distinct from old.created_at
    or old.status is distinct from 'pending'
    or new.status is distinct from 'cancelled'
  ) then
    raise exception 'organization admins may only cancel their own pending request'
      using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end
$$;

create trigger enforce_organization_user_request_update
before update on public.organization_user_requests
for each row execute function app_private.enforce_organization_user_request_update();

create trigger audit_account_signup_approvals
after insert or update or delete on public.account_signup_approvals
for each row execute function app_private.domain_audit_row();

create trigger audit_organization_user_requests
after insert or update or delete on public.organization_user_requests
for each row execute function app_private.domain_audit_row();

create or replace function app_private.domain_has_valid_signup_approval(
  target_email text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_signup_approvals as approval
    join public.organizations as organization
      on organization.id = approval.organization_id
    where approval.email = lower(btrim(target_email))
      and approval.status = 'approved'
      and approval.expires_at > now()
      and organization.status = 'active'
  )
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_approval public.account_signup_approvals%rowtype;
  normalized_email text := lower(btrim(coalesce(new.email, '')));
  trusted_seed boolean := session_user in ('postgres', 'supabase_admin');
begin
  if normalized_email = '' then
    raise exception 'an approved email is required';
  end if;

  if not trusted_seed then
    if not app_private.domain_has_valid_signup_approval(normalized_email) then
      raise exception 'signup is not approved or the approval has expired';
    end if;

    select approval.*
    into signup_approval
    from public.account_signup_approvals as approval
    join public.organizations as organization
      on organization.id = approval.organization_id
    where approval.email = normalized_email
      and approval.status = 'approved'
      and approval.expires_at > now()
      and organization.status = 'active'
    order by approval.created_at desc
    limit 1
    for update of approval;

    if signup_approval.id is null then
      raise exception 'signup is not approved or the approval has expired';
    end if;
  end if;

  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    normalized_email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    'user'
  )
  on conflict (id) do nothing;

  if signup_approval.id is not null then
    update public.account_signup_approvals
    set status = 'registered',
        registered_profile_id = new.id,
        updated_at = now()
    where id = signup_approval.id;
  end if;

  return new;
end
$$;

create or replace function public.claim_approved_signup()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  caller_confirmed_at timestamptz;
  signup_approval public.account_signup_approvals%rowtype;
  membership_id uuid;
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select lower(btrim(auth_user.email)), auth_user.email_confirmed_at
  into caller_email, caller_confirmed_at
  from auth.users as auth_user
  where auth_user.id = caller_id;

  if caller_confirmed_at is null then
    raise exception 'email confirmation required' using errcode = '42501';
  end if;

  select approval.*
  into signup_approval
  from public.account_signup_approvals as approval
  join public.organizations as organization
    on organization.id = approval.organization_id
  where approval.registered_profile_id = caller_id
    and approval.email = caller_email
    and approval.status = 'registered'
    and approval.expires_at > now()
    and organization.status = 'active'
  order by approval.created_at desc
  limit 1
  for update of approval;

  if signup_approval.id is null then
    return null;
  end if;

  insert into public.organization_memberships (
    profile_id,
    organization_id,
    role,
    status,
    invited_by,
    approved_by,
    invited_at,
    approved_at,
    notes
  )
  values (
    caller_id,
    signup_approval.organization_id,
    signup_approval.initial_role,
    'active',
    signup_approval.approved_by,
    signup_approval.approved_by,
    signup_approval.created_at,
    now(),
    'Claimed from platform-approved signup.'
  )
  returning id into membership_id;

  update public.account_signup_approvals
  set status = 'claimed',
      claimed_at = now(),
      updated_at = now()
  where id = signup_approval.id;

  return membership_id;
end
$$;

revoke all on function public.claim_approved_signup() from public, anon;
grant execute on function public.claim_approved_signup() to authenticated;

create or replace function app_private.lookup_protected_asset_manifest_entry(
  requested_dataset_year integer,
  requested_entry_type text,
  requested_survey_id text,
  requested_original_uri text
)
returns table (
  entry_id uuid,
  manifest_id uuid,
  organization_id uuid,
  client_id uuid,
  survey_id text,
  entry_type text,
  protection_level text,
  reference_key text,
  destination_storage_alias text,
  destination_prefix_alias text,
  metadata jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  active_manifest_id uuid;
begin
  if auth.uid() is null
    or requested_dataset_year <> 2026
    or requested_entry_type not in ('tile_group', 'point_cloud')
  then
    return;
  end if;

  select manifest.id
  into active_manifest_id
  from public.workshop_manifests as manifest
  where manifest.dataset_year = requested_dataset_year
    and manifest.status = 'approved'
    and manifest.is_active = true;

  if active_manifest_id is null then
    return;
  end if;

  return query
  select
    entry.id,
    entry.manifest_id,
    entry.organization_id,
    entry.client_id,
    entry.survey_id,
    entry.entry_type,
    entry.protection_level,
    entry.reference_key,
    entry.destination_storage_alias,
    entry.destination_prefix_alias,
    entry.metadata
  from public.workshop_manifest_entries as entry
  where entry.manifest_id = active_manifest_id
    and entry.entry_type = requested_entry_type
    and entry.survey_id = requested_survey_id
    and (
      entry.nginx_route_pattern is null
      or requested_original_uri like replace(
        replace(replace(entry.nginx_route_pattern, '{z}', '%'), '{x}', '%'),
        '{y}', '%'
      )
      or requested_original_uri like replace(entry.nginx_route_pattern, '{file}', '%')
    )
    and app_private.domain_can_read_survey(entry.survey_id)
  limit 1;
end
$$;

grant select, insert, update, delete
  on public.account_signup_approvals,
     public.organization_user_requests
  to authenticated;

revoke all on function app_private.handle_new_user()
  from public, anon, authenticated;

revoke all on function app_private.revoke_removed_membership_grants()
  from public, anon, authenticated;

revoke all on function app_private.enforce_organization_user_request_update()
  from public, anon, authenticated;

revoke all on function app_private.domain_has_valid_signup_approval(text)
  from public, anon, authenticated;
