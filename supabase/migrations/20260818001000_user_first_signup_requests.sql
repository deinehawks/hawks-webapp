-- Correct signup onboarding to user-first registration with platform review.

alter table public.profiles
  add column account_status text not null default 'active',
  add constraint profiles_account_status_check
    check (account_status in ('pending', 'active', 'rejected'));

alter table public.profiles alter column account_status set default 'pending';

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
    and new.account_status = old.account_status
  then
    return new;
  end if;

  raise exception
    'role, person-link, and account-status changes are not permitted';
end
$$;

create table public.account_signup_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  email text not null,
  status text not null default 'pending',
  organization_id uuid references public.organizations(id),
  initial_role public.membership_role,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_signup_requests_email_normalized_check check (
    email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
  ),
  constraint account_signup_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint account_signup_requests_review_shape_check check (
    (status = 'pending' and organization_id is null and initial_role is null
      and reviewed_by is null and reviewed_at is null)
    or (status = 'approved' and organization_id is not null
      and initial_role is not null and reviewed_by is not null
      and reviewed_at is not null)
    or (status = 'rejected' and organization_id is null
      and initial_role is null and reviewed_by is not null
      and reviewed_at is not null)
  )
);

alter table public.account_signup_requests enable row level security;

create policy "users read their signup request"
on public.account_signup_requests for select to authenticated
using (profile_id = (select auth.uid()));

create policy "platform admins read signup requests"
on public.account_signup_requests for select to authenticated
using (app_private.domain_is_platform_admin());

grant select on public.account_signup_requests to authenticated;

create trigger audit_account_signup_requests
after insert or update or delete on public.account_signup_requests
for each row execute function app_private.domain_audit_row();

update public.account_signup_approvals
set status = 'revoked', revoked_at = coalesce(revoked_at, now()), updated_at = now()
where status in ('approved', 'registered');

create or replace function app_private.domain_has_valid_signup_approval(
  target_email text
)
returns boolean language sql stable security definer set search_path = ''
as $$ select false $$;

create or replace function app_private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(coalesce(new.email, '')));
  trusted_seed boolean := session_user in ('postgres', 'supabase_admin');
begin
  if normalized_email = '' then
    raise exception 'a valid email is required';
  end if;

  insert into public.profiles (id, email, role, account_status)
  values (
    new.id, normalized_email, 'user',
    case when trusted_seed then 'active' else 'pending' end
  );

  if not trusted_seed then
    insert into public.account_signup_requests (profile_id, email)
    values (new.id, normalized_email);
  end if;

  return new;
end
$$;

create or replace function public.admin_approve_signup_request(
  target_request_id uuid, target_organization_id uuid,
  target_initial_role public.membership_role,
  target_review_notes text default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  signup_request public.account_signup_requests%rowtype;
  membership_id uuid;
begin
  if auth.uid() is null or not app_private.domain_is_platform_admin() then
    raise exception 'only platform admins can approve signup requests'
      using errcode = '42501';
  end if;

  select request.* into signup_request
  from public.account_signup_requests as request
  where request.id = target_request_id for update;

  if signup_request.id is null then raise exception 'signup request not found'; end if;
  if signup_request.status <> 'pending' then
    raise exception 'only pending signup requests can be approved';
  end if;
  if not exists (
    select 1 from public.organizations
    where id = target_organization_id and status = 'active'
  ) then
    raise exception 'signup requests require an active organization';
  end if;
  if exists (
    select 1 from public.organization_memberships
    where profile_id = signup_request.profile_id
      and status in ('invited', 'pending', 'active', 'suspended')
  ) then
    raise exception 'account already has a live organization membership';
  end if;

  insert into public.organization_memberships (
    profile_id, organization_id, role, status, invited_by, approved_by,
    invited_at, approved_at, notes
  ) values (
    signup_request.profile_id, target_organization_id, target_initial_role,
    'active', auth.uid(), auth.uid(), now(), now(),
    nullif(btrim(target_review_notes), '')
  ) returning id into membership_id;

  update public.profiles
  set account_status = 'active', updated_at = now()
  where id = signup_request.profile_id;

  update public.account_signup_requests
  set status = 'approved', organization_id = target_organization_id,
      initial_role = target_initial_role, reviewed_by = auth.uid(),
      reviewed_at = now(), review_notes = nullif(btrim(target_review_notes), ''),
      updated_at = now()
  where id = signup_request.id;

  return membership_id;
end
$$;

create or replace function public.admin_reject_signup_request(
  target_request_id uuid, target_review_notes text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  signup_request public.account_signup_requests%rowtype;
begin
  if auth.uid() is null or not app_private.domain_is_platform_admin() then
    raise exception 'only platform admins can reject signup requests'
      using errcode = '42501';
  end if;

  select request.* into signup_request
  from public.account_signup_requests as request
  where request.id = target_request_id for update;

  if signup_request.id is null then raise exception 'signup request not found'; end if;
  if signup_request.status <> 'pending' then
    raise exception 'only pending signup requests can be rejected';
  end if;

  update public.profiles
  set account_status = 'rejected', updated_at = now()
  where id = signup_request.profile_id;

  update public.account_signup_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
      review_notes = nullif(btrim(target_review_notes), ''), updated_at = now()
  where id = signup_request.id;
end
$$;

revoke all on function public.admin_approve_signup_request(
  uuid, uuid, public.membership_role, text
) from public, anon;
grant execute on function public.admin_approve_signup_request(
  uuid, uuid, public.membership_role, text
) to authenticated;
revoke all on function public.admin_reject_signup_request(uuid, text)
  from public, anon;
grant execute on function public.admin_reject_signup_request(uuid, text)
  to authenticated;
revoke execute on function public.claim_approved_signup() from authenticated;
