-- Empty-state recovery for dynamic survey publishing.
-- Baseline lookup definition captured read-only from approved staging on 2026-10-05.
-- Run only after explicit environment approval and backup confirmation.
-- SET app.dynamic_publishing_rollback_confirmed = 'confirmed-empty';
-- Published, verified, or draft rows block recovery; retain them and use containment
-- plus a separately reviewed forward recovery instead.
begin;
set local lock_timeout = '5s';
do $guard$
begin
  if current_setting('app.dynamic_publishing_rollback_confirmed', true)
      is distinct from 'confirmed-empty' then
    raise exception 'explicit empty-state rollback confirmation required';
  end if;
  if to_regclass('public.survey_output_publications') is null then
    raise exception 'publication table is missing';
  end if;
  lock table public.survey_output_publications in access exclusive mode;
  if exists (select 1 from public.survey_output_publications) then
    raise exception 'publication rows exist; destructive recovery is prohibited';
  end if;
end
$guard$;

CREATE OR REPLACE FUNCTION app_private.lookup_protected_asset_manifest_entry(requested_dataset_year integer, requested_entry_type text, requested_survey_id text, requested_original_uri text)
 RETURNS TABLE(entry_id uuid, manifest_id uuid, organization_id uuid, client_id uuid, survey_id text, entry_type text, protection_level text, reference_key text, destination_storage_alias text, destination_prefix_alias text, metadata jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  active_manifest_id uuid;
begin
  if auth.uid() is null
    or requested_dataset_year <> 2026
    or requested_entry_type not in ('tile_group', 'point_cloud')
  then
    return;
  end if;

  select manifest.id
  into active_manifest_id
  from public.workshop_manifests as manifest
  where manifest.dataset_year = requested_dataset_year
    and manifest.status = 'approved'
    and manifest.is_active = true;

  if active_manifest_id is null then
    return;
  end if;

  return query
  select
    entry.id,
    entry.manifest_id,
    entry.organization_id,
    entry.client_id,
    entry.survey_id,
    entry.entry_type,
    entry.protection_level,
    entry.reference_key,
    entry.destination_storage_alias,
    entry.destination_prefix_alias,
    entry.metadata
  from public.workshop_manifest_entries as entry
  join public.surveys as survey
    on survey.id = entry.survey_id
   and survey.client_id = entry.client_id
  join public.clients as client
    on client.id = entry.client_id
  where entry.manifest_id = active_manifest_id
    and entry.entry_type = requested_entry_type
    and entry.survey_id = requested_survey_id
    and (
      entry.nginx_route_pattern is null
      or requested_original_uri like replace(
        replace(replace(entry.nginx_route_pattern, '{z}', '%'), '{x}', '%'),
        '{y}', '%'
      )
      or requested_original_uri like replace(entry.nginx_route_pattern, '{file}', '%')
    )
    and (
      (
        entry.protection_level = 'organization'
        and app_private.domain_can_read_survey(entry.survey_id)
      )
      or (
        entry.protection_level = 'private'
        and entry.organization_id is null
        and client.classification_kind = 'individual'
        and exists (
          select 1
          from public.client_people as client_person
          where client_person.client_id = entry.client_id
            and client_person.review_status = 'confirmed'
            and client_person.is_primary
        )
        and not exists (
          select 1
          from public.client_organizations as client_org
          where client_org.client_id = entry.client_id
            and client_org.review_status = 'confirmed'
            and client_org.is_primary
        )
        and not exists (
          select 1
          from public.survey_organizations as survey_org
          where survey_org.survey_id = entry.survey_id
        )
        and (
          app_private.domain_is_platform_admin()
          or app_private.domain_has_survey_grant(entry.survey_id)
        )
      )
      or (
        entry.protection_level = 'platform_admin'
        and app_private.domain_is_platform_admin()
      )
    )
  limit 1;
end
$function$;


drop function public.list_authorized_published_survey_assets();
drop function public.platform_admin_save_output_publication(uuid,integer,text,integer,integer,jsonb,text,bigint,text);
drop function public.service_verify_output_publication(uuid,jsonb,text,text);
drop function public.platform_admin_publish_output(uuid);
drop function public.platform_admin_retire_output_publication(uuid);
drop function public.platform_admin_delete_output_publication_draft(uuid);
drop function app_private.output_publication_matches_current_artifact(uuid);
drop function app_private.resolve_output_publication_scope(text);
drop table public.survey_output_publications;
commit;
