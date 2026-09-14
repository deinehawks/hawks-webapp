-- Guarded non-destructive containment for Platform Admin Dataset Onboarding.
-- This disables the feature without changing clients, relationships, surveys,
-- or audit evidence. Full reversal requires the tested pre-migration backup.
--
-- Run through an operator connection that owns the deployed functions or can
-- assume their actual owner. Local clones and hosted Supabase may assign
-- different owners, so the script verifies the deployed ownership dynamically.
--
-- Required operator preamble in the same psql session:
--   set app.dataset_onboarding_containment = 'confirmed';

begin;

do $$
begin
  if current_setting('app.dataset_onboarding_containment', true)
       is distinct from 'confirmed' then
    raise exception
      'Set app.dataset_onboarding_containment=confirmed after verifying the target';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc as function
    where function.oid in (
      to_regprocedure(
        'public.platform_admin_preview_dataset_onboarding(jsonb)'
      ),
      to_regprocedure(
        'public.platform_admin_commit_dataset_onboarding(jsonb)'
      )
    )
      and not pg_catalog.pg_has_role(
        current_user,
        function.proowner,
        'USAGE'
      )
  ) then
    raise exception
      'Current role cannot contain the deployed Dataset Onboarding functions';
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
