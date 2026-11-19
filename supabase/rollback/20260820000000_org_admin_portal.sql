-- Organization Admin portal containment rollback for non-production rollout.
--
-- This script is intentionally non-destructive. It disables every org-admin
-- mutation RPC and the two added grant-management read policies while
-- preserving data, functions, audit history, and platform-admin behavior for
-- investigation. Full reversal requires the tested pre-migration backup.
--
-- Required operator preamble in the same psql session:
--   set app.org_admin_portal_containment = 'confirmed';

begin;

do $$
begin
  if current_setting('app.org_admin_portal_containment', true)
       is distinct from 'confirmed' then
    raise exception
      'Set app.org_admin_portal_containment=confirmed after verifying the target';
  end if;
end
$$;

revoke execute on function public.org_admin_update_organization(
  uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text
) from authenticated;
revoke execute on function public.org_admin_create_user_request(text,text,text)
  from authenticated;
revoke execute on function public.org_admin_cancel_user_request(uuid)
  from authenticated;
revoke execute on function public.org_admin_update_member_status(
  uuid,public.membership_status,text
) from authenticated;
revoke execute on function public.org_admin_promote_member(uuid)
  from authenticated;
revoke execute on function public.org_admin_create_farm(
  text,text,text,text,numeric,text
) from authenticated;
revoke execute on function public.org_admin_update_farm(
  uuid,text,text,text,text,numeric,text,text
) from authenticated;
revoke execute on function public.org_admin_create_farm_grant(uuid,uuid,text)
  from authenticated;
revoke execute on function public.org_admin_set_farm_grant_status(
  uuid,public.access_grant_status,text
) from authenticated;
revoke execute on function public.org_admin_create_survey_grant(uuid,text,text)
  from authenticated;
revoke execute on function public.org_admin_set_survey_grant_status(
  uuid,public.access_grant_status,text
) from authenticated;

drop policy if exists "organization admins read organization farm grants"
  on public.farm_access_grants;
drop policy if exists "organization admins read organization survey grants"
  on public.survey_access_grants;

commit;
