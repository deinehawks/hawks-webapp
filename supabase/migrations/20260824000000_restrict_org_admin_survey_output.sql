-- Survey metadata and outputs remain exclusively platform-admin managed.

revoke all on function public.org_admin_update_survey(
  text, text, date, numeric, text, text, text, public.mission_status
) from public, anon, authenticated;

revoke all on function public.org_admin_update_output(
  uuid, text, text, text
) from public, anon, authenticated;

drop function public.org_admin_update_survey(
  text, text, date, numeric, text, text, text, public.mission_status
);

drop function public.org_admin_update_output(uuid, text, text, text);

