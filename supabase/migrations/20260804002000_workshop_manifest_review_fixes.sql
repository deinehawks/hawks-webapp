-- Phase 3I-B review fixes: active manifest selection, null-safe approval,
-- creator defaults, and stricter supersession validation.
--
-- This migration intentionally follows the initial workshop manifest draft so
-- review comments are preserved while the final database behavior is hardened.

alter table public.workshop_manifests
  add column if not exists is_active boolean not null default false;

create unique index workshop_manifests_one_active_approved_year_idx
  on public.workshop_manifests(dataset_year)
  where status = 'approved' and is_active;

create or replace function app_private.enforce_workshop_manifest_mutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  approver_email text;
  superseded_status text;
  replacement_status text;
  replacement_supersedes_id uuid;
begin
  if auth.role() = 'service_role'
    or (
      session_user in ('postgres', 'supabase_admin')
      and auth.uid() is null
    )
  then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if not app_private.domain_is_platform_admin() then
    raise exception 'workshop manifest changes require platform admin access';
  end if;

  if tg_op = 'DELETE' then
    raise exception 'workshop manifests must be superseded, not deleted';
  end if;

  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by = auth.uid();
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'approved'
    and new.status = 'superseded'
    and new.superseded_by_manifest_id is not null
    and new.id = old.id
    and new.manifest_key = old.manifest_key
    and new.dataset_year = old.dataset_year
    and new.title is not distinct from old.title
    and new.description is not distinct from old.description
    and new.approved_by is not distinct from old.approved_by
    and new.approved_at is not distinct from old.approved_at
    and new.supersedes_manifest_id is not distinct from old.supersedes_manifest_id
    and new.backup_storage_alias is not distinct from old.backup_storage_alias
    and new.backup_object_alias is not distinct from old.backup_object_alias
    and new.backup_exported_at is not distinct from old.backup_exported_at
    and new.notes is not distinct from old.notes
    and new.metadata is not distinct from old.metadata
    and new.created_by is not distinct from old.created_by
    and new.created_at is not distinct from old.created_at
  then
    select manifest.status, manifest.supersedes_manifest_id
    into replacement_status, replacement_supersedes_id
    from public.workshop_manifests as manifest
    where manifest.id = new.superseded_by_manifest_id;

    if replacement_status is distinct from 'approved'
      or replacement_supersedes_id is distinct from old.id
    then
      raise exception
        'superseding workshop manifest must be approved and point back to the superseded manifest';
    end if;

    new.is_active = false;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status in ('approved', 'superseded') then
    raise exception 'approved or superseded workshop manifests are immutable';
  end if;

  if new.status = 'approved' then
    select profile.email
    into approver_email
    from public.profiles as profile
    where profile.id = new.approved_by;

    if lower(coalesce(approver_email, '')) <> 'visualization.hawks@gmail.com' then
      raise exception 'workshop manifest approval requires the project lead account';
    end if;

    if new.approved_at is null then
      new.approved_at = now();
    end if;
  end if;

  if new.status not in ('approved', 'superseded') then
    new.approved_by = null;
    new.approved_at = null;
    new.is_active = false;
  end if;

  if new.status = 'superseded' then
    new.is_active = false;
  end if;

  if new.supersedes_manifest_id is not null then
    select manifest.status
    into superseded_status
    from public.workshop_manifests as manifest
    where manifest.id = new.supersedes_manifest_id;

    if superseded_status is distinct from 'approved' then
      raise exception 'only approved workshop manifests may be superseded';
    end if;
  end if;

  return new;
end
$$;

revoke all on function app_private.enforce_workshop_manifest_mutability()
  from public, anon, authenticated;

create or replace function app_private.enforce_workshop_manifest_entry_mutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_status text;
begin
  if auth.role() = 'service_role'
    or (
      session_user in ('postgres', 'supabase_admin')
      and auth.uid() is null
    )
  then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if not app_private.domain_is_platform_admin() then
    raise exception 'workshop manifest entry changes require platform admin access';
  end if;

  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by = auth.uid();
  end if;

  select manifest.status
  into parent_status
  from public.workshop_manifests as manifest
  where manifest.id = case
    when tg_op = 'DELETE' then old.manifest_id
    else new.manifest_id
  end;

  if parent_status in ('approved', 'superseded') then
    raise exception 'approved or superseded workshop manifest entries are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end
$$;

revoke all on function app_private.enforce_workshop_manifest_entry_mutability()
  from public, anon, authenticated;
