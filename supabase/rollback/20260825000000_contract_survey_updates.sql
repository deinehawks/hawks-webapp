-- Guarded non-destructive containment for the survey update contract.
-- This disables the application RPC while preserving locked table updates.
-- Full reversal to broad direct updates requires the tested pre-apply backup.

begin;

revoke execute on function public.platform_admin_update_survey(
  text, text, date, numeric, text, text, text, public.mission_status
) from authenticated;

commit;
