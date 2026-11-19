-- Access Policy v2 containment rollback.
--
-- This script is intentionally non-destructive. It disables new signup,
-- onboarding, and non-platform resource reads while preserving memberships,
-- grants, approvals, requests, and audit history for investigation.
--
-- A full schema/data rollback must restore the tested pre-migration backup.
-- Do not guess whether a current member was formerly viewer/editor after the
-- migration has been used.
--
-- Required operator preamble in the same psql session:
--   set app.access_policy_v2_containment = 'confirmed';

begin;

do $$
begin
  if current_setting('app.access_policy_v2_containment', true)
       is distinct from 'confirmed' then
    raise exception
      'Set app.access_policy_v2_containment=confirmed after verifying the target';
  end if;
end
$$;

revoke execute on function public.claim_approved_signup()
  from authenticated;

drop policy if exists "platform admins manage signup approvals"
  on public.account_signup_approvals;
drop policy if exists "platform admins manage onboarding requests"
  on public.organization_user_requests;
drop policy if exists "organization admins read their onboarding requests"
  on public.organization_user_requests;
drop policy if exists "organization admins create their onboarding requests"
  on public.organization_user_requests;
drop policy if exists "organization admins cancel their onboarding requests"
  on public.organization_user_requests;

revoke select, insert, update, delete
  on public.account_signup_approvals,
     public.organization_user_requests
  from authenticated;

drop policy if exists "access policy v2 containment surveys"
  on public.surveys;
create policy "access policy v2 containment surveys"
on public.surveys as restrictive for select to authenticated
using (app_private.domain_is_platform_admin());

drop policy if exists "access policy v2 containment farms"
  on public.farms;
create policy "access policy v2 containment farms"
on public.farms as restrictive for select to authenticated
using (app_private.domain_is_platform_admin());

drop policy if exists "access policy v2 containment outputs"
  on public.survey_outputs;
create policy "access policy v2 containment outputs"
on public.survey_outputs as restrictive for select to authenticated
using (app_private.domain_is_platform_admin());

drop policy if exists "access policy v2 containment orthos"
  on public.orthos;
create policy "access policy v2 containment orthos"
on public.orthos as restrictive for select to authenticated
using (app_private.domain_is_platform_admin());

drop policy if exists "access policy v2 containment point clouds"
  on public.point_clouds;
create policy "access policy v2 containment point clouds"
on public.point_clouds as restrictive for select to authenticated
using (app_private.domain_is_platform_admin());

commit;
