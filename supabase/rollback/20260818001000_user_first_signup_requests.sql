-- Containment rollback for an unused staging rollout only.
-- If requests were reviewed, restore the tested pre-migration backup.

revoke execute on function public.admin_approve_signup_request(
  uuid, uuid, public.membership_role, text
) from authenticated;
revoke execute on function public.admin_reject_signup_request(uuid, text)
  from authenticated;
drop function if exists public.admin_approve_signup_request(
  uuid, uuid, public.membership_role, text
);
drop function if exists public.admin_reject_signup_request(uuid, text);
drop table if exists public.account_signup_requests;
alter table public.profiles
  drop constraint if exists profiles_account_status_check,
  drop column if exists account_status;

-- Restore app_private.handle_new_user(), approval helpers, and execute grants
-- from the tested pre-migration schema backup before accepting signups.
