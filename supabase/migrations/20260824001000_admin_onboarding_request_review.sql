-- Platform-admin review queue for organization-admin onboarding requests.

alter table public.organization_user_requests
  add column review_notes text,
  add constraint organization_user_requests_review_notes_length_check
    check (review_notes is null or char_length(review_notes) <= 2000);

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
    or new.review_notes is distinct from old.review_notes
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

drop policy if exists "platform admins manage onboarding requests"
  on public.organization_user_requests;

create policy "platform admins read onboarding requests"
on public.organization_user_requests for select to authenticated
using (app_private.domain_is_platform_admin());

revoke insert, update, delete on public.organization_user_requests
  from authenticated;
grant select on public.organization_user_requests to authenticated;

create or replace function public.admin_approve_organization_user_request(
  target_request_id uuid,
  target_review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  onboarding_request public.organization_user_requests%rowtype;
begin
  if auth.uid() is null or not app_private.domain_is_platform_admin() then
    raise exception 'only platform admins can approve onboarding requests'
      using errcode = '42501';
  end if;

  select request.* into onboarding_request
  from public.organization_user_requests as request
  where request.id = target_request_id
  for update;

  if onboarding_request.id is null then
    raise exception 'onboarding request not found';
  end if;
  if onboarding_request.status <> 'pending' then
    raise exception 'only pending onboarding requests can be approved';
  end if;
  if not exists (
    select 1 from public.organizations
    where id = onboarding_request.organization_id and status = 'active'
  ) then
    raise exception 'onboarding approval requires an active organization';
  end if;

  update public.organization_user_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
      review_notes = nullif(left(btrim(coalesce(target_review_notes, '')), 2000), '')
  where id = onboarding_request.id;

  return onboarding_request.id;
end
$$;

create or replace function public.admin_reject_organization_user_request(
  target_request_id uuid,
  target_review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  onboarding_request public.organization_user_requests%rowtype;
begin
  if auth.uid() is null or not app_private.domain_is_platform_admin() then
    raise exception 'only platform admins can reject onboarding requests'
      using errcode = '42501';
  end if;

  select request.* into onboarding_request
  from public.organization_user_requests as request
  where request.id = target_request_id
  for update;

  if onboarding_request.id is null then
    raise exception 'onboarding request not found';
  end if;
  if onboarding_request.status <> 'pending' then
    raise exception 'only pending onboarding requests can be rejected';
  end if;

  update public.organization_user_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
      review_notes = nullif(left(btrim(coalesce(target_review_notes, '')), 2000), '')
  where id = onboarding_request.id;

  return onboarding_request.id;
end
$$;

revoke all on function public.admin_approve_organization_user_request(uuid, text)
  from public, anon;
grant execute on function public.admin_approve_organization_user_request(uuid, text)
  to authenticated;
revoke all on function public.admin_reject_organization_user_request(uuid, text)
  from public, anon;
grant execute on function public.admin_reject_organization_user_request(uuid, text)
  to authenticated;
