-- Enforce workshop manifest protection levels at authorization time.
--
-- Organization entries retain existing domain access. Private entries require
-- a canonical individual client and an explicit survey grant. Platform-admin
-- entries remain visible only to platform administrators.

create or replace function app_private.lookup_protected_asset_manifest_entry(
  requested_dataset_year integer,
  requested_entry_type text,
  requested_survey_id text,
  requested_original_uri text
)
returns table (
  entry_id uuid,
  manifest_id uuid,
  organization_id uuid,
  client_id uuid,
  survey_id text,
  entry_type text,
  protection_level text,
  reference_key text,
  destination_storage_alias text,
  destination_prefix_alias text,
  metadata jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
$$;

revoke all on function app_private.lookup_protected_asset_manifest_entry(
  integer,
  text,
  text,
  text
) from public, anon, authenticated;
