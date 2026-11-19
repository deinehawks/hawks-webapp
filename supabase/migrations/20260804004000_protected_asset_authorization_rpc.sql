-- Phase 3I-C: protected asset authorization lookup RPC.
--
-- This lets authenticated application users authorize a single parsed GIS asset
-- request against the active approved workshop manifest without granting broad
-- read access to the manifest tables.

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
  if auth.uid() is null then
    return;
  end if;

  if requested_dataset_year <> 2026 then
    return;
  end if;

  if requested_entry_type not in ('tile_group', 'point_cloud') then
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
  where entry.manifest_id = active_manifest_id
    and entry.entry_type = requested_entry_type
    and entry.survey_id = requested_survey_id
    and (
      entry.nginx_route_pattern is null
      or requested_original_uri like replace(
        replace(
          replace(entry.nginx_route_pattern, '{z}', '%'),
          '{x}',
          '%'
        ),
        '{y}',
        '%'
      )
      or requested_original_uri like replace(entry.nginx_route_pattern, '{file}', '%')
    )
    and (
      app_private.domain_is_platform_admin()
      or (
        entry.protection_level = 'organization'
        and (
          app_private.is_my_organization(entry.client_id)
          or app_private.domain_has_active_membership(entry.organization_id)
        )
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

create or replace function public.authorize_workshop_protected_asset(
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
language sql
stable
security definer
set search_path = ''
as $$
  select *
  from app_private.lookup_protected_asset_manifest_entry(
    requested_dataset_year,
    requested_entry_type,
    requested_survey_id,
    requested_original_uri
  )
$$;

revoke all on function public.authorize_workshop_protected_asset(
  integer,
  text,
  text,
  text
) from public, anon;

grant execute on function public.authorize_workshop_protected_asset(
  integer,
  text,
  text,
  text
) to authenticated, service_role;
