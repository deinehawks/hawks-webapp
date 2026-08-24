-- Non-destructive containment for platform-admin onboarding review.
-- Full reversal requires the tested pre-migration backup.
--
-- Required operator preamble in the same psql session:
--   set app.admin_onboarding_review_containment = 'confirmed';

begin;

do $$
begin
  if current_setting('app.admin_onboarding_review_containment', true)
       is distinct from 'confirmed' then
    raise exception
      'Set app.admin_onboarding_review_containment=confirmed after verifying the target';
  end if;
end
$$;

revoke execute on function public.admin_approve_organization_user_request(uuid, text)
  from authenticated;
revoke execute on function public.admin_reject_organization_user_request(uuid, text)
  from authenticated;

commit;
