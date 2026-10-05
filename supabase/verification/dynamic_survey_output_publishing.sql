-- Read-only post-apply contract check for dynamic survey publishing.
begin read only;

do $check$
declare
  signature text;
  function_oid oid;
begin
  if not exists (
    select 1 from pg_class
    where oid = to_regclass('public.survey_output_publications')
      and relrowsecurity
  ) then
    raise exception 'publication table or RLS is missing';
  end if;

  foreach signature in array array[
    'public.platform_admin_save_output_publication(uuid,integer,text,integer,integer,jsonb,text,bigint,text)',
    'public.platform_admin_publish_output(uuid)',
    'public.platform_admin_retire_output_publication(uuid)',
    'public.platform_admin_delete_output_publication_draft(uuid)'
  ] loop
    function_oid := to_regprocedure(signature);
    if function_oid is null then
      raise exception 'missing RPC: %', signature;
    end if;
    if not exists (
      select 1 from pg_proc
      where oid = function_oid and prosecdef
        and proconfig @> array['search_path=""']::text[]
    ) or not has_function_privilege('authenticated', function_oid, 'EXECUTE')
      or has_function_privilege('anon', function_oid, 'EXECUTE')
      or has_function_privilege('service_role', function_oid, 'EXECUTE') then
      raise exception 'incorrect platform RPC security: %', signature;
    end if;
  end loop;

  function_oid := to_regprocedure('public.service_verify_output_publication(uuid,jsonb,text,text)');
  if function_oid is null then
    raise exception 'service verification RPC is missing';
  end if;
  if not has_function_privilege('service_role', function_oid, 'EXECUTE')
    or has_function_privilege('authenticated', function_oid, 'EXECUTE')
    or has_function_privilege('anon', function_oid, 'EXECUTE') then
    raise exception 'service verification permissions are incorrect';
  end if;

  function_oid := to_regprocedure('public.list_authorized_published_survey_assets()');
  if function_oid is null then
    raise exception 'discovery RPC is missing';
  end if;
  if not has_function_privilege('authenticated', function_oid, 'EXECUTE')
    or not has_function_privilege('service_role', function_oid, 'EXECUTE')
    or has_function_privilege('anon', function_oid, 'EXECUTE') then
    raise exception 'discovery permissions are incorrect';
  end if;

  foreach signature in array array[
    'app_private.resolve_output_publication_scope(text)',
    'app_private.output_publication_matches_current_artifact(uuid)'
  ] loop
    function_oid := to_regprocedure(signature);
    if function_oid is null then
      raise exception 'private helper is missing: %', signature;
    end if;
    if has_function_privilege('anon', function_oid, 'EXECUTE')
      or has_function_privilege('authenticated', function_oid, 'EXECUTE')
      or has_function_privilege('service_role', function_oid, 'EXECUTE') then
      raise exception 'private helper is directly executable: %', signature;
    end if;
  end loop;

  foreach signature in array array['anon', 'authenticated', 'service_role'] loop
    if has_table_privilege(signature, 'public.survey_output_publications', 'INSERT')
      or has_table_privilege(signature, 'public.survey_output_publications', 'UPDATE')
      or has_table_privilege(signature, 'public.survey_output_publications', 'DELETE') then
      raise exception 'direct publication mutation is allowed for %', signature;
    end if;
  end loop;

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  if exists (select 1 from public.list_authorized_published_survey_assets()) then
    raise exception 'discovery exposes rows without an authenticated user';
  end if;
end
$check$;

select
  (select count(*) from public.surveys) as surveys,
  (select count(*) from public.survey_outputs) as outputs,
  (select count(*) from public.survey_output_publications) as publications,
  (select count(*) from public.workshop_manifest_entries) as manifest_entries,
  (select count(*) from public.workshop_manifest_entries entry
    join public.workshop_manifests manifest on manifest.id = entry.manifest_id
    where manifest.status = 'approved' and manifest.is_active) as active_entries;

rollback;
