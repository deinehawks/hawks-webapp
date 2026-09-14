-- Guarded non-destructive containment for Platform Admin Dataset Onboarding.
-- This disables the feature without changing clients, relationships, surveys,
-- or audit evidence. Full reversal requires the tested pre-migration backup.
--
-- Run through an operator connection that can assume the Supabase function
-- owner (`supabase_admin`). The script fails rather than silently succeeding
-- when that ownership boundary is unavailable.
--
-- Required operator preamble in the same psql session:
--   set app.dataset_onboarding_containment = 'confirmed';

begin;

-- Supabase-owned functions are assigned to supabase_admin even when an
-- operator connects as postgres. Revoke as the owning role so the containment
-- cannot report success while leaving the authenticated grants effective.
set local role supabase_admin;

do $$
begin
  if current_setting('app.dataset_onboarding_containment', true)
       is distinct from 'confirmed' then
    raise exception
      'Set app.dataset_onboarding_containment=confirmed after verifying the target';
  end if;
end
$$;

revoke execute on function
  public.platform_admin_preview_dataset_onboarding(jsonb)
  from authenticated;
revoke execute on function
  public.platform_admin_commit_dataset_onboarding(jsonb)
  from authenticated;

do $$
begin
  if has_function_privilege(
       'authenticated',
       'public.platform_admin_preview_dataset_onboarding(jsonb)',
       'execute'
     )
     or has_function_privilege(
       'authenticated',
       'public.platform_admin_commit_dataset_onboarding(jsonb)',
       'execute'
     ) then
    raise exception
      'Dataset onboarding containment did not remove authenticated execution';
  end if;
end
$$;

commit;
