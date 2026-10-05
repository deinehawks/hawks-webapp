-- Dynamic protected-asset publication for survey outputs.
--
-- V3 owns onboarding and publication. Consumer applications discover only
-- current, verified, published output deliveries through a narrow RPC. The
-- immutable workshop manifest remains a compatibility fallback for existing
-- assets until they are represented by this contract.

create table public.survey_output_publications (
  id uuid primary key default gen_random_uuid(),
  output_id uuid not null unique references public.survey_outputs(id)
    on delete restrict,
  survey_id text not null references public.surveys(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete restrict,
  entry_type text not null,
  status text not null default 'draft',
  protection_level text not null,
  dataset_year integer not null,
  client_code text not null,
  destination_storage_alias text not null,
  destination_prefix_alias text,
  object_path text not null,
  route_pattern text not null,
  tile_folder text,
  min_zoom smallint,
  max_zoom smallint,
  bounds double precision[],
  file_name text,
  byte_size bigint,
  verification jsonb not null default '{}'::jsonb,
  source_system text,
  external_run_id text,
  verified_at timestamptz,
  published_at timestamptz,
  retired_at timestamptz,
  created_by uuid references public.profiles(id),
  verified_by uuid references public.profiles(id),
  published_by uuid references public.profiles(id),
  retired_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_output_publications_entry_type_check
    check (entry_type in ('tile_group', 'point_cloud')),
  constraint survey_output_publications_status_check
    check (status in ('draft', 'verified', 'published', 'retired')),
  constraint survey_output_publications_protection_check
    check (protection_level in ('organization', 'private')),
  constraint survey_output_publications_year_check
    check (dataset_year between 2000 and 2100),
  constraint survey_output_publications_client_code_check
    check (client_code ~ '^[a-z0-9][a-z0-9._-]*$'),
  constraint survey_output_publications_storage_alias_check
    check (destination_storage_alias ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'),
  constraint survey_output_publications_prefix_alias_check
    check (
      destination_prefix_alias is null
      or destination_prefix_alias ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    ),
  constraint survey_output_publications_object_path_check
    check (
      object_path <> '' and object_path !~ '(^|/)\.\.?(/|$)'
      and object_path !~ '//' and object_path !~ '\\'
    ),
  constraint survey_output_publications_route_check
    check (route_pattern like '/asimov-hawks/%'),
  constraint survey_output_publications_tile_shape_check
    check (
      entry_type <> 'tile_group'
      or (
        tile_folder is not null
        and tile_folder ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
        and min_zoom between 0 and 30
        and max_zoom between min_zoom and 30
        and array_length(bounds, 1) = 4
        and bounds[1] < bounds[3]
        and bounds[2] < bounds[4]
        and bounds[1] between -180 and 180
        and bounds[3] between -180 and 180
        and bounds[2] between -90 and 90
        and bounds[4] between -90 and 90
        and file_name is null
        and byte_size is null
      )
    ),
  constraint survey_output_publications_point_cloud_shape_check
    check (
      entry_type <> 'point_cloud'
      or (
        file_name ~* '^[A-Za-z0-9][A-Za-z0-9._-]{0,250}\.pcd$'
        and byte_size between 1 and 5368709120
        and tile_folder is null
        and min_zoom is null
        and max_zoom is null
        and bounds is null
      )
    ),
  constraint survey_output_publications_verification_check
    check (
      (status = 'draft' and verified_at is null)
      or (
        status in ('verified', 'published', 'retired')
        and verified_at is not null
        and verification @> '{"verified":true}'::jsonb
      )
    ),
  constraint survey_output_publications_publish_check
    check (
      (status in ('draft', 'verified') and published_at is null)
      or (status in ('published', 'retired') and published_at is not null)
    ),
  constraint survey_output_publications_retire_check
    check (
      (status <> 'retired' and retired_at is null)
      or (status = 'retired' and retired_at is not null)
    )
);

create unique index survey_output_publications_external_run_idx
  on public.survey_output_publications(source_system, external_run_id)
  where source_system is not null and external_run_id is not null;

create index survey_output_publications_survey_status_idx
  on public.survey_output_publications(survey_id, status, entry_type);

create trigger set_survey_output_publications_updated_at
before update on public.survey_output_publications
for each row execute function app_private.set_updated_at();

create trigger audit_survey_output_publications
after insert or update or delete on public.survey_output_publications
for each row execute function app_private.domain_audit_row();

alter table public.survey_output_publications enable row level security;

create policy "platform admins read output publications"
on public.survey_output_publications for select to authenticated
using (app_private.domain_is_platform_admin());

revoke all on table public.survey_output_publications
  from public, anon, authenticated;
grant select on table public.survey_output_publications to authenticated;
revoke insert, update, delete on table public.survey_output_publications
  from service_role;

create or replace function app_private.resolve_output_publication_scope(
  target_survey_id text
)
returns table (
  resolved_organization_id uuid,
  resolved_protection_level text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_client_id uuid;
  target_classification public.client_classification_kind;
begin
  select survey.client_id, client.classification_kind
  into target_client_id, target_classification
  from public.surveys as survey
  join public.clients as client on client.id = survey.client_id
  where survey.id = target_survey_id;

  if target_client_id is null then
    raise exception 'survey or client relationship not found';
  end if;

  select survey_org.organization_id
  into resolved_organization_id
  from public.survey_organizations as survey_org
  join public.organizations as organization
    on organization.id = survey_org.organization_id
   and organization.status = 'active'
  where survey_org.survey_id = target_survey_id
    and survey_org.review_status = 'confirmed'
  order by survey_org.organization_id
  limit 1;

  if resolved_organization_id is null then
    select client_org.organization_id
    into resolved_organization_id
    from public.client_organizations as client_org
    join public.organizations as organization
      on organization.id = client_org.organization_id
     and organization.status = 'active'
    where client_org.client_id = target_client_id
      and client_org.review_status = 'confirmed'
      and client_org.is_primary
    order by client_org.organization_id
    limit 1;
  end if;

  if resolved_organization_id is not null then
    resolved_protection_level := 'organization';
    return next;
    return;
  end if;

  if target_classification = 'individual'
    and exists (
      select 1 from public.client_people as client_person
      where client_person.client_id = target_client_id
        and client_person.review_status = 'confirmed'
        and client_person.is_primary
    )
    and not exists (
      select 1 from public.client_organizations as client_org
      where client_org.client_id = target_client_id
        and client_org.review_status = 'confirmed'
    )
    and not exists (
      select 1 from public.survey_organizations as survey_org
      where survey_org.survey_id = target_survey_id
        and survey_org.review_status = 'confirmed'
    )
  then
    resolved_organization_id := null;
    resolved_protection_level := 'private';
    return next;
    return;
  end if;

  raise exception 'survey ownership is not ready for protected publication';
end
$$;

create or replace function app_private.output_publication_matches_current_artifact(
  target_publication_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.survey_output_publications as publication
    join public.survey_outputs as output
      on output.id = publication.output_id
    join public.surveys as survey
      on survey.id = publication.survey_id
    where publication.id = target_publication_id
      and output.survey_id = publication.survey_id
      and output.is_current
      and output.status in ('ready', 'approved')
      and (
        (
          publication.entry_type = 'tile_group'
          and output.output_type = 'orthomosaic'
          and exists (
            select 1
            from public.orthos as ortho
            where ortho.survey_id = survey.id
              and ortho.is_current
              and ortho.id = survey.ortho
              and ortho.tile_folder = publication.tile_folder
          )
        )
        or (
          publication.entry_type = 'point_cloud'
          and output.output_type = 'point_cloud'
          and exists (
            select 1
            from public.point_clouds as point_cloud
            where point_cloud.survey_id = survey.id
              and point_cloud.is_current
              and point_cloud.code = survey.point_cloud
          )
        )
      )
  )
$$;

revoke all on function app_private.output_publication_matches_current_artifact(uuid)
  from public, anon, authenticated;

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
    or requested_dataset_year not between 2000 and 2100
    or requested_entry_type not in ('tile_group', 'point_cloud')
  then
    return;
  end if;

  -- A current dynamic publication supersedes the legacy manifest entry for
  -- the same survey and output kind. A mismatched old URL therefore fails
  -- closed instead of silently falling back.
  if exists (
    select 1
    from public.survey_output_publications as publication
    where publication.status in ('published', 'retired')
      and publication.dataset_year = requested_dataset_year
      and publication.entry_type = requested_entry_type
      and publication.survey_id = requested_survey_id
  ) then
    return query
    select
      publication.id,
      publication.id,
      publication.organization_id,
      survey.client_id,
      publication.survey_id,
      publication.entry_type,
      publication.protection_level,
      publication.object_path,
      publication.destination_storage_alias,
      publication.destination_prefix_alias,
      jsonb_strip_nulls(jsonb_build_object(
        'object_path', publication.object_path,
        'client_code', publication.client_code,
        'tile_folder', publication.tile_folder,
        'min_zoom', publication.min_zoom,
        'max_zoom', publication.max_zoom,
        'tile_extent', to_jsonb(publication.bounds),
        'file_name', publication.file_name,
        'bytes', publication.byte_size,
        'publication_id', publication.id
      ))
    from public.survey_output_publications as publication
    join public.survey_outputs as output
      on output.id = publication.output_id
    join public.surveys as survey
      on survey.id = publication.survey_id
    where publication.status = 'published'
      and publication.dataset_year = requested_dataset_year
      and publication.entry_type = requested_entry_type
      and publication.survey_id = requested_survey_id
      and output.is_current
      and output.status in ('ready', 'approved')
      and app_private.output_publication_matches_current_artifact(publication.id)
      and requested_original_uri like replace(
        replace(
          replace(
            replace(publication.route_pattern, '{z}', '%'),
            '{x}',
            '%'
          ),
          '{y}',
          '%'
        ),
        '{file}',
        '%'
      )
      and app_private.domain_can_read_survey(publication.survey_id)
    limit 1;
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
        '{y}',
        '%'
      )
      or requested_original_uri like replace(
        entry.nginx_route_pattern,
        '{file}',
        '%'
      )
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

create or replace function public.service_verify_output_publication(
  target_output_id uuid,
  verification_payload jsonb,
  verification_source_system text,
  verification_external_run_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_publication public.survey_output_publications%rowtype;
  existing_run public.survey_output_publications%rowtype;
  reported_bytes bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if nullif(btrim(verification_source_system), '') is null
    or nullif(btrim(verification_external_run_id), '') is null
  then
    raise exception 'verification source and run ID are required';
  end if;
  if not coalesce((verification_payload ->> 'verified')::boolean, false) then
    raise exception 'verification payload must confirm verified=true';
  end if;

  select * into existing_run
  from public.survey_output_publications
  where source_system = btrim(verification_source_system)
    and external_run_id = btrim(verification_external_run_id);
  if found then
    if existing_run.output_id <> target_output_id then
      raise exception 'verification run ID is already bound to another output';
    end if;
    return existing_run.id;
  end if;

  select * into target_publication
  from public.survey_output_publications
  where output_id = target_output_id
  for update;
  if not found then raise exception 'output publication draft not found'; end if;
  if target_publication.status in ('published', 'retired') then
    raise exception '% output publications cannot be re-verified',
      target_publication.status;
  end if;

  reported_bytes := coalesce(
    nullif(verification_payload ->> 'total_bytes', '')::bigint,
    nullif(verification_payload ->> 'bytes', '')::bigint
  );
  if target_publication.entry_type = 'tile_group' then
    if coalesce(
      nullif(verification_payload ->> 'object_count', '')::bigint,
      0
    ) < 1 or coalesce(reported_bytes, 0) < 1
    then
      raise exception
        'tile verification requires positive object_count and total_bytes';
    end if;
  elsif reported_bytes is distinct from target_publication.byte_size then
    raise exception
      'point-cloud verification bytes do not match the publication draft';
  end if;

  update public.survey_output_publications
  set status = 'verified',
      verification = verification_payload,
      source_system = btrim(verification_source_system),
      external_run_id = btrim(verification_external_run_id),
      verified_at = now(),
      verified_by = auth.uid()
  where id = target_publication.id;
  return target_publication.id;
end
$$;

create or replace function public.platform_admin_publish_output(
  target_output_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_publication public.survey_output_publications%rowtype;
  target_output public.survey_outputs%rowtype;
begin
  if not app_private.domain_is_platform_admin() then
    raise exception 'platform administrator access required' using errcode = '42501';
  end if;
  select * into target_publication
  from public.survey_output_publications
  where output_id = target_output_id
  for update;
  if not found then raise exception 'output publication draft not found'; end if;
  if target_publication.status <> 'verified' then
    raise exception 'only verified output publications can be published';
  end if;

  select * into target_output
  from public.survey_outputs
  where id = target_output_id;
  if not target_output.is_current
    or target_output.status not in ('ready', 'approved')
  then
    raise exception 'the survey output must be current and ready or approved';
  end if;
  if target_output.survey_id <> target_publication.survey_id then
    raise exception 'publication survey does not match the survey output';
  end if;

  if target_publication.entry_type = 'tile_group' then
    if target_output.output_type <> 'orthomosaic'
      or not exists (
        select 1
        from public.surveys as survey
        join public.orthos as ortho
          on ortho.survey_id = survey.id and ortho.is_current
        where survey.id = target_output.survey_id
          and survey.ortho = ortho.id
          and ortho.tile_folder = target_publication.tile_folder
      )
    then
      raise exception
        'current orthomosaic metadata does not match the publication';
    end if;
  elsif target_output.output_type <> 'point_cloud'
    or not exists (
      select 1
      from public.surveys as survey
      join public.point_clouds as point_cloud
        on point_cloud.survey_id = survey.id and point_cloud.is_current
      where survey.id = target_output.survey_id
        and survey.point_cloud = point_cloud.code
    )
  then
    raise exception
      'current point-cloud metadata does not match the publication';
  end if;

  update public.survey_output_publications
  set status = 'published',
      published_at = now(),
      published_by = auth.uid()
  where id = target_publication.id;

  insert into public.admin_audit_log (
    actor_profile_id, action, table_schema, table_name, record_pk, metadata
  ) values (
    auth.uid(), 'OUTPUT_PUBLICATION_PUBLISHED', 'public',
    'survey_output_publications',
    jsonb_build_object('id', target_publication.id),
    jsonb_build_object(
      'output_id', target_output.id,
      'survey_id', target_output.survey_id
    )
  );
  return target_publication.id;
end
$$;

create or replace function public.platform_admin_retire_output_publication(
  target_output_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_publication public.survey_output_publications%rowtype;
begin
  if not app_private.domain_is_platform_admin() then
    raise exception 'platform administrator access required' using errcode = '42501';
  end if;
  select * into target_publication
  from public.survey_output_publications
  where output_id = target_output_id
  for update;
  if not found then raise exception 'output publication not found'; end if;
  if target_publication.status <> 'published' then
    raise exception 'only published output publications can be retired';
  end if;

  update public.survey_output_publications
  set status = 'retired',
      retired_at = now(),
      retired_by = auth.uid()
  where id = target_publication.id;

  insert into public.admin_audit_log (
    actor_profile_id, action, table_schema, table_name, record_pk, metadata
  ) values (
    auth.uid(), 'OUTPUT_PUBLICATION_RETIRED', 'public',
    'survey_output_publications',
    jsonb_build_object('id', target_publication.id),
    jsonb_build_object(
      'output_id', target_output_id,
      'survey_id', target_publication.survey_id
    )
  );
  return target_publication.id;
end
$$;

create or replace function public.platform_admin_delete_output_publication_draft(
  target_output_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_publication public.survey_output_publications%rowtype;
begin
  if not app_private.domain_is_platform_admin() then
    raise exception 'platform administrator access required' using errcode = '42501';
  end if;
  select * into target_publication
  from public.survey_output_publications
  where output_id = target_output_id
  for update;
  if not found then raise exception 'output publication not found'; end if;
  if target_publication.status not in ('draft', 'verified') then
    raise exception 'published or retired output publications cannot be deleted';
  end if;

  delete from public.survey_output_publications
  where id = target_publication.id;

  insert into public.admin_audit_log (
    actor_profile_id, action, table_schema, table_name, record_pk, metadata
  ) values (
    auth.uid(), 'OUTPUT_PUBLICATION_DRAFT_DELETED', 'public',
    'survey_output_publications',
    jsonb_build_object('id', target_publication.id),
    jsonb_build_object(
      'output_id', target_output_id,
      'survey_id', target_publication.survey_id
    )
  );
end
$$;

revoke all on function app_private.resolve_output_publication_scope(text)
  from public, anon, authenticated;

create or replace function public.platform_admin_save_output_publication(
  target_output_id uuid,
  target_dataset_year integer,
  target_tile_folder text default null,
  target_min_zoom integer default null,
  target_max_zoom integer default null,
  target_bounds jsonb default null,
  target_file_name text default null,
  target_byte_size bigint default null,
  target_destination_prefix_alias text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_output public.survey_outputs%rowtype;
  target_survey public.surveys%rowtype;
  target_client public.clients%rowtype;
  existing_publication public.survey_output_publications%rowtype;
  resolved_entry_type text;
  resolved_storage_alias text;
  resolved_client_code text;
  resolved_organization_id uuid;
  resolved_protection_level text;
  resolved_tile_folder text;
  resolved_file_name text;
  resolved_bounds double precision[];
  resolved_object_path text;
  resolved_route_pattern text;
  saved_id uuid;
begin
  if not app_private.domain_is_platform_admin() then
    raise exception 'platform administrator access required' using errcode = '42501';
  end if;

  select * into target_output
  from public.survey_outputs
  where id = target_output_id;
  if not found then raise exception 'survey output not found'; end if;
  if target_output.output_type not in ('orthomosaic', 'point_cloud') then
    raise exception 'only orthomosaic and point-cloud outputs can be published';
  end if;
  if target_dataset_year not between 2000 and 2100 then
    raise exception 'dataset year must be between 2000 and 2100';
  end if;

  select * into target_survey
  from public.surveys
  where id = target_output.survey_id;
  select * into target_client
  from public.clients
  where id = target_survey.client_id;
  if target_client.id is null then
    raise exception 'survey client relationship not found';
  end if;

  resolved_client_code := lower(btrim(target_client.code));
  if resolved_client_code !~ '^[a-z0-9][a-z0-9._-]*$' then
    raise exception 'client code is not safe for a protected asset route';
  end if;

  select scope.resolved_organization_id, scope.resolved_protection_level
  into resolved_organization_id, resolved_protection_level
  from app_private.resolve_output_publication_scope(target_output.survey_id) as scope;

  select * into existing_publication
  from public.survey_output_publications
  where output_id = target_output_id
  for update;
  if found and existing_publication.status in ('published', 'retired') then
    raise exception '% output publications are immutable', existing_publication.status;
  end if;

  if target_destination_prefix_alias is not null
    and target_destination_prefix_alias !~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  then
    raise exception 'destination prefix alias is invalid';
  end if;

  if target_output.output_type = 'orthomosaic' then
    resolved_entry_type := 'tile_group';
    resolved_storage_alias := 'tiles';
    resolved_tile_folder := btrim(coalesce(target_tile_folder, ''));
    if resolved_tile_folder !~ '^[A-Za-z0-9][A-Za-z0-9._-]*$' then
      raise exception 'tile folder is invalid';
    end if;
    if target_min_zoom not between 0 and 30
      or target_max_zoom not between target_min_zoom and 30
    then
      raise exception 'tile zoom range is invalid';
    end if;
    if jsonb_typeof(target_bounds) <> 'array'
      or jsonb_array_length(target_bounds) <> 4
    then
      raise exception 'tile bounds must contain four coordinates';
    end if;
    begin
      select array_agg(value::double precision order by ordinal)
      into resolved_bounds
      from jsonb_array_elements_text(target_bounds)
        with ordinality as item(value, ordinal);
    exception when others then
      raise exception 'tile bounds must contain finite numbers';
    end;
    if resolved_bounds[1] >= resolved_bounds[3]
      or resolved_bounds[2] >= resolved_bounds[4]
      or resolved_bounds[1] not between -180 and 180
      or resolved_bounds[3] not between -180 and 180
      or resolved_bounds[2] not between -90 and 90
      or resolved_bounds[4] not between -90 and 90
    then
      raise exception 'tile bounds are invalid';
    end if;
    resolved_object_path := format(
      '%s/%s/%s/ortho/%s',
      resolved_client_code,
      target_dataset_year,
      target_output.survey_id,
      resolved_tile_folder
    );
    resolved_route_pattern := format(
      '/asimov-hawks/tiles/%s/%s/%s/ortho/%s/{z}/{x}/{y}.png',
      resolved_client_code,
      target_dataset_year,
      target_output.survey_id,
      resolved_tile_folder
    );
  else
    resolved_entry_type := 'point_cloud';
    resolved_storage_alias := 'pointclouds';
    resolved_file_name := btrim(coalesce(target_file_name, ''));
    if resolved_file_name !~*
      '^[A-Za-z0-9][A-Za-z0-9._-]{0,250}\.pcd$'
    then
      raise exception 'point-cloud filename is invalid';
    end if;
    if target_byte_size not between 1 and 5368709120 then
      raise exception 'point cloud must be between 1 byte and 5 GiB';
    end if;
    resolved_object_path := format(
      '%s/%s/%s/point-clouds/%s',
      resolved_client_code,
      target_dataset_year,
      target_output.survey_id,
      resolved_file_name
    );
    resolved_route_pattern := format(
      '/asimov-hawks/3d/%s/%s/%s/%s',
      resolved_client_code,
      target_dataset_year,
      target_output.survey_id,
      resolved_file_name
    );
  end if;

  insert into public.survey_output_publications (
    output_id, survey_id, organization_id, entry_type, status,
    protection_level, dataset_year, client_code,
    destination_storage_alias, destination_prefix_alias, object_path,
    route_pattern, tile_folder, min_zoom, max_zoom, bounds, file_name,
    byte_size, verification, verified_at, verified_by, source_system,
    external_run_id, created_by
  ) values (
    target_output.id, target_output.survey_id, resolved_organization_id,
    resolved_entry_type, 'draft', resolved_protection_level,
    target_dataset_year, resolved_client_code, resolved_storage_alias,
    target_destination_prefix_alias, resolved_object_path,
    resolved_route_pattern, resolved_tile_folder, target_min_zoom,
    target_max_zoom, resolved_bounds, resolved_file_name, target_byte_size,
    '{}'::jsonb, null, null, null, null, auth.uid()
  )
  on conflict (output_id) do update set
    survey_id = excluded.survey_id,
    organization_id = excluded.organization_id,
    entry_type = excluded.entry_type,
    status = 'draft',
    protection_level = excluded.protection_level,
    dataset_year = excluded.dataset_year,
    client_code = excluded.client_code,
    destination_storage_alias = excluded.destination_storage_alias,
    destination_prefix_alias = excluded.destination_prefix_alias,
    object_path = excluded.object_path,
    route_pattern = excluded.route_pattern,
    tile_folder = excluded.tile_folder,
    min_zoom = excluded.min_zoom,
    max_zoom = excluded.max_zoom,
    bounds = excluded.bounds,
    file_name = excluded.file_name,
    byte_size = excluded.byte_size,
    verification = '{}'::jsonb,
    source_system = null,
    external_run_id = null,
    verified_at = null,
    verified_by = null
  returning id into saved_id;

  insert into public.admin_audit_log (
    actor_profile_id, action, table_schema, table_name, record_pk, metadata
  ) values (
    auth.uid(), 'OUTPUT_PUBLICATION_DRAFT_SAVED', 'public',
    'survey_output_publications', jsonb_build_object('id', saved_id),
    jsonb_build_object(
      'output_id', target_output.id,
      'survey_id', target_output.survey_id
    )
  );
  return saved_id;
end
$$;

create or replace function public.list_authorized_published_survey_assets()
returns table (
  source_kind text,
  publication_id uuid,
  output_id uuid,
  survey_id text,
  output_type text,
  artifact_code text,
  dataset_year integer,
  client_code text,
  route_template text,
  tile_folder text,
  min_zoom integer,
  max_zoom integer,
  bounds jsonb,
  file_name text,
  byte_size bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with dynamic_assets as (
    select
      'publication'::text as source_kind,
      publication.id as publication_id,
      publication.output_id,
      publication.survey_id,
      output.output_type,
      case publication.entry_type
        when 'tile_group' then survey.ortho
        when 'point_cloud' then survey.point_cloud
      end as artifact_code,
      publication.dataset_year,
      publication.client_code,
      publication.route_pattern as route_template,
      publication.tile_folder,
      publication.min_zoom::integer,
      publication.max_zoom::integer,
      to_jsonb(publication.bounds) as bounds,
      publication.file_name,
      publication.byte_size
    from public.survey_output_publications as publication
    join public.survey_outputs as output
      on output.id = publication.output_id
    join public.surveys as survey
      on survey.id = publication.survey_id
    where auth.uid() is not null
      and publication.status = 'published'
      and output.is_current
      and output.status in ('ready', 'approved')
      and app_private.output_publication_matches_current_artifact(publication.id)
      and app_private.domain_can_read_survey(publication.survey_id)
  ),
  legacy_assets as (
    select
      'legacy_manifest'::text as source_kind,
      null::uuid as publication_id,
      entry.output_id,
      entry.survey_id,
      case entry.entry_type
        when 'tile_group' then 'orthomosaic'
        when 'point_cloud' then 'point_cloud'
      end as output_type,
      case entry.entry_type
        when 'tile_group' then survey.ortho
        when 'point_cloud' then survey.point_cloud
      end as artifact_code,
      manifest.dataset_year,
      coalesce(
        entry.metadata ->> 'client_code',
        lower(client.code)
      ) as client_code,
      entry.nginx_route_pattern as route_template,
      entry.metadata ->> 'tile_folder' as tile_folder,
      nullif(entry.metadata ->> 'min_zoom', '')::integer as min_zoom,
      nullif(entry.metadata ->> 'max_zoom', '')::integer as max_zoom,
      entry.metadata -> 'tile_extent' as bounds,
      entry.metadata ->> 'file_name' as file_name,
      nullif(entry.metadata ->> 'bytes', '')::bigint as byte_size
    from public.workshop_manifests as manifest
    join public.workshop_manifest_entries as entry
      on entry.manifest_id = manifest.id
    join public.surveys as survey
      on survey.id = entry.survey_id
     and survey.client_id = entry.client_id
    join public.clients as client
      on client.id = survey.client_id
    where auth.uid() is not null
      and manifest.status = 'approved'
      and manifest.is_active
      and entry.entry_type in ('tile_group', 'point_cloud')
      and entry.nginx_route_pattern is not null
      and (
        (
          entry.protection_level = 'organization'
          and app_private.domain_can_read_survey(entry.survey_id)
        )
        or (
          entry.protection_level = 'private'
          and entry.organization_id is null
          and client.classification_kind = 'individual'
          and app_private.domain_can_read_survey(entry.survey_id)
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
        )
        or (
          entry.protection_level = 'platform_admin'
          and app_private.domain_is_platform_admin()
        )
      )
      and not exists (
        select 1
        from public.survey_output_publications as publication
        where publication.survey_id = entry.survey_id
          and publication.entry_type = entry.entry_type
          and publication.dataset_year = manifest.dataset_year
          and publication.status in ('published', 'retired')
      )
  )
  select * from dynamic_assets
  union all
  select * from legacy_assets
  order by survey_id, output_type
$$;

revoke all on function public.platform_admin_save_output_publication(
  uuid, integer, text, integer, integer, jsonb, text, bigint, text
) from public, anon, service_role;
revoke all on function public.service_verify_output_publication(
  uuid, jsonb, text, text
) from public, anon, authenticated;
revoke all on function public.platform_admin_publish_output(uuid)
  from public, anon, service_role;
revoke all on function public.platform_admin_retire_output_publication(uuid)
  from public, anon, service_role;
revoke all on function public.platform_admin_delete_output_publication_draft(uuid)
  from public, anon, service_role;
revoke all on function public.list_authorized_published_survey_assets()
  from public, anon;

grant execute on function public.platform_admin_save_output_publication(
  uuid, integer, text, integer, integer, jsonb, text, bigint, text
) to authenticated;
grant execute on function public.service_verify_output_publication(
  uuid, jsonb, text, text
) to service_role;
grant execute on function public.platform_admin_publish_output(uuid)
  to authenticated;
grant execute on function public.platform_admin_retire_output_publication(uuid)
  to authenticated;
grant execute on function public.platform_admin_delete_output_publication_draft(uuid)
  to authenticated;
grant execute on function public.list_authorized_published_survey_assets()
  to authenticated, service_role;
