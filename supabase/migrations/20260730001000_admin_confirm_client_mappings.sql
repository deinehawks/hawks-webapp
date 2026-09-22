-- Phase 3G-B: controlled canonical mapping RPCs for legacy clients.
--
-- These functions are intentionally narrow:
-- - platform-admin only
-- - no deletes
-- - no membership, farm, grant, output, storage, or asset mutations
-- - mapping table writes are audited by Phase 3G-A triggers

create or replace function public.admin_confirm_client_organization_mapping(
  target_client_id uuid,
  target_organization_id uuid,
  mapping_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.domain_is_platform_admin() then
    raise exception 'only platform admins can map legacy clients'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.clients where id = target_client_id
  ) then
    raise exception 'legacy client not found'
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.organizations where id = target_organization_id
  ) then
    raise exception 'organization not found'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.client_people
    where client_id = target_client_id
      and review_status = 'confirmed'
  ) then
    raise exception
      'legacy client already has a confirmed person mapping'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.client_organizations
    where client_id = target_client_id
      and organization_id <> target_organization_id
      and review_status = 'confirmed'
  ) then
    raise exception
      'legacy client already has a different confirmed organization mapping'
      using errcode = '23505';
  end if;

  insert into public.client_organizations (
    client_id,
    organization_id,
    relationship_type,
    review_status,
    is_primary,
    notes,
    created_by
  )
  values (
    target_client_id,
    target_organization_id,
    'legacy_client',
    'confirmed',
    true,
    nullif(left(coalesce(mapping_notes, ''), 2000), ''),
    auth.uid()
  )
  on conflict (client_id, organization_id)
  do update set
    relationship_type = 'legacy_client',
    review_status = 'confirmed',
    is_primary = true,
    notes = excluded.notes,
    created_by = coalesce(public.client_organizations.created_by, auth.uid());

  update public.clients
  set classification_kind = 'organization',
      classification_reviewed_at = now(),
      classification_reviewed_by = auth.uid()
  where id = target_client_id;
end
$$;

create or replace function public.admin_confirm_client_person_mapping(
  target_client_id uuid,
  target_person_id uuid,
  mapping_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.domain_is_platform_admin() then
    raise exception 'only platform admins can map legacy clients'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.clients where id = target_client_id
  ) then
    raise exception 'legacy client not found'
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.people where id = target_person_id
  ) then
    raise exception 'person not found'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.client_organizations
    where client_id = target_client_id
      and review_status = 'confirmed'
  ) then
    raise exception
      'legacy client already has a confirmed organization mapping'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.client_people
    where client_id = target_client_id
      and person_id <> target_person_id
      and review_status = 'confirmed'
  ) then
    raise exception
      'legacy client already has a different confirmed person mapping'
      using errcode = '23505';
  end if;

  insert into public.client_people (
    client_id,
    person_id,
    relationship_type,
    review_status,
    is_primary,
    notes,
    created_by
  )
  values (
    target_client_id,
    target_person_id,
    'legacy_client',
    'confirmed',
    true,
    nullif(left(coalesce(mapping_notes, ''), 2000), ''),
    auth.uid()
  )
  on conflict (client_id, person_id)
  do update set
    relationship_type = 'legacy_client',
    review_status = 'confirmed',
    is_primary = true,
    notes = excluded.notes,
    created_by = coalesce(public.client_people.created_by, auth.uid());

  update public.clients
  set classification_kind = 'individual',
      classification_reviewed_at = now(),
      classification_reviewed_by = auth.uid()
  where id = target_client_id;
end
$$;

revoke all on function public.admin_confirm_client_organization_mapping(
  uuid,
  uuid,
  text
) from public, anon;
revoke all on function public.admin_confirm_client_person_mapping(
  uuid,
  uuid,
  text
) from public, anon;

grant execute on function public.admin_confirm_client_organization_mapping(
  uuid,
  uuid,
  text
) to authenticated;
grant execute on function public.admin_confirm_client_person_mapping(
  uuid,
  uuid,
  text
) to authenticated;
