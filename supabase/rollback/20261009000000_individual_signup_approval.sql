-- Guarded containment rollback. Once an individual signup has been approved,
-- restore from the reviewed backup or ship a forward fix instead.

do $$
begin
  if exists (
    select 1
    from public.account_signup_requests
    where status = 'approved'
      and organization_id is null
      and initial_role is null
  ) then
    raise exception 'rollback refused: approved individual signup requests exist';
  end if;
end
$$;

revoke execute on function public.admin_approve_individual_signup_request(uuid, text)
  from authenticated;
drop function if exists public.admin_approve_individual_signup_request(uuid, text);

drop policy if exists "tenant users can read accessible clients"
  on public.clients;

create policy "tenant users can read accessible clients"
on public.clients for select to authenticated
using (
  app_private.domain_is_platform_admin()
  or app_private.domain_has_client_access(id)
);

drop function if exists app_private.domain_has_granted_client_visibility(uuid);

alter table public.account_signup_requests
  drop constraint account_signup_requests_review_shape_check;

alter table public.account_signup_requests
  add constraint account_signup_requests_review_shape_check check (
    (status = 'pending' and organization_id is null and initial_role is null
      and reviewed_by is null and reviewed_at is null)
    or (status = 'approved' and organization_id is not null
      and initial_role is not null and reviewed_by is not null
      and reviewed_at is not null)
    or (status = 'rejected' and organization_id is null
      and initial_role is null and reviewed_by is not null
      and reviewed_at is not null)
  );
