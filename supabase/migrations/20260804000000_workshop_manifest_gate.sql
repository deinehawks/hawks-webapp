-- Phase 3I-B: private workshop manifest gate.
--
-- This migration is additive. It stores the real workshop manifest in private
-- Supabase tables, preserves approved manifest versions for auditability, and
-- does not migrate assets or expose protected asset delivery.
--
-- Decisions captured:
-- - real storage details are represented by opaque aliases in manifest rows;
-- - final approval is tied to the profile email visualization.hawks@gmail.com;
-- - approved and superseded manifests are immutable in normal app workflows;
-- - emergency fixes use superseding manifest versions, not direct edits;
-- - individual tile files are not enumerated.

create table public.workshop_manifests (
  id uuid primary key default gen_random_uuid(),
  manifest_key text not null unique,
  status text not null default 'draft',
  dataset_year integer not null default 2026,
  title text,
  description text,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  supersedes_manifest_id uuid references public.workshop_manifests(id),
  superseded_by_manifest_id uuid references public.workshop_manifests(id),
  backup_storage_alias text,
  backup_object_alias text,
  backup_exported_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workshop_manifests_key_format
    check (manifest_key ~ '^manifest-[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  constraint workshop_manifests_status_check
    check (status in ('draft', 'reviewed', 'approved', 'superseded')),
  constraint workshop_manifests_dataset_year_check
    check (dataset_year between 2026 and 2100),
  constraint workshop_manifests_approval_check
    check (
      (
        status = 'approved'
        and approved_by is not null
        and approved_at is not null
      )
      or status <> 'approved'
    ),
  constraint workshop_manifests_backup_alias_pair_check
    check (
      (
        backup_storage_alias is null
        and backup_object_alias is null
        and backup_exported_at is null
      )
      or (
        backup_storage_alias is not null
        and backup_object_alias is not null
      )
    ),
  constraint workshop_manifests_no_self_supersede_check
    check (supersedes_manifest_id is null or supersedes_manifest_id <> id),
  constraint workshop_manifests_no_self_superseded_by_check
    check (superseded_by_manifest_id is null or superseded_by_manifest_id <> id)
);

create table public.workshop_manifest_entries (
  id uuid primary key default gen_random_uuid(),
  manifest_id uuid not null references public.workshop_manifests(id)
    on delete restrict,
  entry_type text not null,
  organization_id uuid references public.organizations(id),
  client_id uuid references public.clients(id),
  survey_id text references public.surveys(id),
  farm_id uuid references public.farms(id),
  profile_id uuid references public.profiles(id),
  output_id uuid references public.survey_outputs(id),
  reference_key text not null,
  display_label text,
  source_alias text,
  destination_storage_alias text,
  destination_prefix_alias text,
  nginx_route_pattern text,
  protection_level text not null default 'organization',
  verification jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workshop_manifest_entries_type_check
    check (
      entry_type in (
        'account',
        'organization',
        'legacy_client',
        'farm',
        'survey',
        'tile_group',
        'point_cloud',
        'detection',
        'output',
        'report',
        'rollback',
        'access_test'
      )
    ),
  constraint workshop_manifest_entries_protection_check
    check (protection_level in ('organization', 'platform_admin', 'private')),
  constraint workshop_manifest_entries_reference_key_check
    check (length(trim(reference_key)) > 0),
  constraint workshop_manifest_entries_tile_group_not_file_check
    check (
      entry_type <> 'tile_group'
      or reference_key !~ '/[0-9]+/[0-9]+/[0-9]+\\.png$'
    )
);

create index workshop_manifests_status_idx
  on public.workshop_manifests(status);

create index workshop_manifests_dataset_year_idx
  on public.workshop_manifests(dataset_year);

create index workshop_manifests_approved_at_idx
  on public.workshop_manifests(approved_at desc)
  where approved_at is not null;

create index workshop_manifests_supersedes_idx
  on public.workshop_manifests(supersedes_manifest_id)
  where supersedes_manifest_id is not null;

create index workshop_manifest_entries_manifest_id_idx
  on public.workshop_manifest_entries(manifest_id);

create index workshop_manifest_entries_type_idx
  on public.workshop_manifest_entries(entry_type);

create index workshop_manifest_entries_organization_id_idx
  on public.workshop_manifest_entries(organization_id);

create index workshop_manifest_entries_client_id_idx
  on public.workshop_manifest_entries(client_id);

create index workshop_manifest_entries_survey_id_idx
  on public.workshop_manifest_entries(survey_id);

create unique index workshop_manifest_entries_manifest_reference_idx
  on public.workshop_manifest_entries(manifest_id, entry_type, reference_key);

create or replace function app_private.enforce_workshop_manifest_mutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  approver_email text;
  superseded_status text;
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

  if tg_op = 'UPDATE' and old.status in ('approved', 'superseded') then
    raise exception 'approved or superseded workshop manifests are immutable';
  end if;

  if new.status = 'approved' then
    select profile.email
    into approver_email
    from public.profiles as profile
    where profile.id = new.approved_by;

    if approver_email <> 'visualization.hawks@gmail.com' then
      raise exception 'workshop manifest approval requires the project lead account';
    end if;

    if new.approved_at is null then
      new.approved_at = now();
    end if;
  end if;

  if new.status <> 'approved' then
    new.approved_by = null;
    new.approved_at = null;
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

drop trigger if exists enforce_workshop_manifest_mutability
  on public.workshop_manifests;
create trigger enforce_workshop_manifest_mutability
before update or delete on public.workshop_manifests
for each row execute function app_private.enforce_workshop_manifest_mutability();

drop trigger if exists enforce_workshop_manifest_insert
  on public.workshop_manifests;
create trigger enforce_workshop_manifest_insert
before insert on public.workshop_manifests
for each row execute function app_private.enforce_workshop_manifest_mutability();

drop trigger if exists enforce_workshop_manifest_entry_mutability
  on public.workshop_manifest_entries;
create trigger enforce_workshop_manifest_entry_mutability
before insert or update or delete on public.workshop_manifest_entries
for each row execute function app_private.enforce_workshop_manifest_entry_mutability();

drop trigger if exists set_workshop_manifests_updated_at
  on public.workshop_manifests;
create trigger set_workshop_manifests_updated_at
before update on public.workshop_manifests
for each row execute function app_private.set_updated_at();

drop trigger if exists set_workshop_manifest_entries_updated_at
  on public.workshop_manifest_entries;
create trigger set_workshop_manifest_entries_updated_at
before update on public.workshop_manifest_entries
for each row execute function app_private.set_updated_at();

drop trigger if exists audit_workshop_manifests
  on public.workshop_manifests;
create trigger audit_workshop_manifests
after insert or update or delete on public.workshop_manifests
for each row execute function app_private.domain_audit_row();

drop trigger if exists audit_workshop_manifest_entries
  on public.workshop_manifest_entries;
create trigger audit_workshop_manifest_entries
after insert or update or delete on public.workshop_manifest_entries
for each row execute function app_private.domain_audit_row();

alter table public.workshop_manifests enable row level security;
alter table public.workshop_manifest_entries enable row level security;

create policy "platform admins read workshop manifests"
on public.workshop_manifests for select to authenticated
using (app_private.domain_is_platform_admin());

create policy "platform admins manage workshop manifests"
on public.workshop_manifests for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "platform admins read workshop manifest entries"
on public.workshop_manifest_entries for select to authenticated
using (app_private.domain_is_platform_admin());

create policy "platform admins manage workshop manifest entries"
on public.workshop_manifest_entries for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

grant select on public.workshop_manifests,
  public.workshop_manifest_entries to authenticated;

grant insert, update, delete on public.workshop_manifests,
  public.workshop_manifest_entries to authenticated;
