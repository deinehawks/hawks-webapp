-- Allow platform admins to activate individual accounts without fabricating
-- an organization membership. Resource access remains grant-specific.

alter table public.account_signup_requests
  drop constraint account_signup_requests_review_shape_check;

alter table public.account_signup_requests
  add constraint account_signup_requests_review_shape_check check (
    (status = 'pending'
      and organization_id is null
      and initial_role is null
      and reviewed_by is null
      and reviewed_at is null)
    or (status = 'approved'
      and reviewed_by is not null
      and reviewed_at is not null
      and ((organization_id is not null and initial_role is not null)
        or (organization_id is null and initial_role is null)))
    or (status = 'rejected'
      and organization_id is null
      and initial_role is null
      and reviewed_by is not null
      and reviewed_at is not null)
  );

create or replace function public.admin_approve_individual_signup_request(
  target_request_id uuid,
  target_review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_request public.account_signup_requests%rowtype;
  target_profile public.profiles%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles as actor
    where actor.id = (select auth.uid())
      and actor.role = 'platform_admin'
      and actor.account_status = 'active'
  ) then
    raise exception 'only active platform admins can approve individual signup requests'
      using errcode = '42501';
  end if;

  select request.* into signup_request
  from public.account_signup_requests as request
  where request.id = target_request_id
  for update;

  if signup_request.id is null then
    raise exception 'signup request not found';
  end if;
  if signup_request.status <> 'pending' then
    raise exception 'only pending signup requests can be approved';
  end if;

  select profile.* into target_profile
  from public.profiles as profile
  where profile.id = signup_request.profile_id
  for update;

  if target_profile.id is null then
    raise exception 'signup request profile not found';
  end if;
  if target_profile.role <> 'user' or target_profile.account_status <> 'pending' then
    raise exception 'individual signup profile must be a pending user';
  end if;
  if exists (
    select 1
    from public.organization_memberships as membership
    where membership.profile_id = signup_request.profile_id
      and membership.status in ('invited', 'pending', 'active', 'suspended')
  ) then
    raise exception 'individual signup account already has a live organization membership';
  end if;

  update public.profiles
  set account_status = 'active', updated_at = now()
  where id = signup_request.profile_id;

  update public.account_signup_requests
  set status = 'approved', organization_id = null, initial_role = null,
      reviewed_by = auth.uid(), reviewed_at = now(),
      review_notes = nullif(btrim(target_review_notes), ''), updated_at = now()
  where id = signup_request.id;

  return signup_request.profile_id;
end
$$;

revoke all on function public.admin_approve_individual_signup_request(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_approve_individual_signup_request(uuid, text)
  to authenticated;

create or replace function app_private.domain_has_granted_client_visibility(
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
    from public.surveys as survey
    where survey.client_id = target_client_id
      and app_private.domain_has_survey_grant(survey.id)
  )
$$;

revoke all on function app_private.domain_has_granted_client_visibility(uuid)
  from public, anon, authenticated, service_role;
grant execute on function app_private.domain_has_granted_client_visibility(uuid)
  to authenticated, service_role;

drop policy if exists "tenant users can read accessible clients"
  on public.clients;

create policy "tenant users can read accessible clients"
on public.clients for select to authenticated
using (
  app_private.domain_has_client_access(id)
  or app_private.domain_has_granted_client_visibility(id)
);
