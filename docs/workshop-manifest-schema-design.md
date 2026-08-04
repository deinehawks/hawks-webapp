# Workshop Manifest Supabase Schema Design

Last updated: 2026-08-04

Status: design contract only. Do not apply as a migration until reviewed and approved.

This document defines the minimal Supabase schema, RLS, and audit contract for storing the real workshop manifest privately in Supabase. It follows the current repository authorization pattern: `app_private.domain_is_platform_admin()` controls platform-admin access, RLS is enabled on every new table, and privileged changes are audited through `public.admin_audit_log`.

## Goals

- Store the real populated workshop manifest outside Git.
- Preserve short manifest IDs such as `manifest-2026-09-15`.
- Allow `platform_admin` users to edit draft and reviewed manifests.
- Tie final approval to the application account `visualization.hawks@gmail.com`, resolved to the relevant `profiles.id`.
- Make approved manifests immutable.
- Allow later changes only through a superseding manifest version.
- Audit create, update, approve, supersede, and backup/export events.
- Support private MinIO backup metadata.
- Avoid storing unnecessary personal data.

## Non-Goals

- Do not create Auth users.
- Do not migrate assets.
- Do not expose the manifest to organization members.
- Do not enumerate individual tile files.
- Do not implement protected asset delivery in this schema migration.
- Do not require checksums for workshop approval.

## Proposed Tables

### `public.workshop_manifests`

One row per manifest version.

Recommended columns:

```sql
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
  minio_backup_bucket text,
  minio_backup_object_key text,
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
      (status = 'approved' and approved_by is not null and approved_at is not null)
      or (status <> 'approved')
    ),
  constraint workshop_manifests_backup_pair_check
    check (
      (minio_backup_bucket is null and minio_backup_object_key is null)
      or (minio_backup_bucket is not null and minio_backup_object_key is not null)
    )
);
```

Recommended indexes:

```sql
create index workshop_manifests_status_idx
  on public.workshop_manifests(status);

create index workshop_manifests_dataset_year_idx
  on public.workshop_manifests(dataset_year);

create index workshop_manifests_approved_at_idx
  on public.workshop_manifests(approved_at desc)
  where approved_at is not null;
```

### `public.workshop_manifest_entries`

One row per manifest item. Tiles are represented as tile groups, roots, or object-storage prefixes, not individual `{z}/{x}/{y}.png` files.

Recommended columns:

```sql
create table public.workshop_manifest_entries (
  id uuid primary key default gen_random_uuid(),
  manifest_id uuid not null references public.workshop_manifests(id)
    on delete cascade,
  entry_type text not null,
  organization_id uuid references public.organizations(id),
  client_id uuid references public.clients(id),
  survey_id text references public.surveys(id),
  farm_id uuid references public.farms(id),
  profile_id uuid references public.profiles(id),
  output_id uuid references public.survey_outputs(id),
  reference_key text not null,
  display_label text,
  source_ref text,
  destination_bucket text,
  destination_prefix text,
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
    check (length(trim(reference_key)) > 0)
);
```

Recommended indexes:

```sql
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
```

Recommended `verification` JSON shape for tile groups:

```json
{
  "object_count": 12345,
  "total_bytes": 987654321,
  "min_zoom": 10,
  "max_zoom": 24,
  "sample_tiles_checked": true,
  "map_smoke_test": "not_run"
}
```

### Audit Storage

Use the existing `public.admin_audit_log` instead of creating a separate manifest audit table.

Rationale:

- The existing domain foundation already has `admin_audit_log`.
- Existing audit trigger functions record `actor_profile_id`, action, table name, primary key, old data, and new data.
- Platform admins already have read access to the audit log.
- Reusing it avoids duplicated audit infrastructure.

Recommended trigger coverage:

```sql
create trigger audit_workshop_manifests
after insert or update or delete on public.workshop_manifests
for each row execute function app_private.domain_audit_row();

create trigger audit_workshop_manifest_entries
after insert or update or delete on public.workshop_manifest_entries
for each row execute function app_private.domain_audit_row();
```

## Approval And Immutability

Approved manifests must not be edited directly.

Recommended enforcement function:

```sql
create or replace function app_private.enforce_workshop_manifest_mutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  approver_email text;
begin
  if auth.role() = 'service_role'
    or (
      session_user in ('postgres', 'supabase_admin')
      and auth.uid() is null
    )
  then
    return new;
  end if;

  if not app_private.domain_is_platform_admin() then
    raise exception 'workshop manifest changes require platform admin access';
  end if;

  if tg_op = 'UPDATE' and old.status in ('approved', 'superseded') then
    raise exception 'approved or superseded workshop manifests are immutable';
  end if;

  if tg_op = 'DELETE' then
    raise exception 'workshop manifests must be superseded, not deleted';
  end if;

  if new.status = 'approved' then
    select profile.email
    into approver_email
    from public.profiles as profile
    where profile.id = new.approved_by;

    if approver_email <> 'visualization.hawks@gmail.com' then
      raise exception 'workshop manifest approval requires the project lead account';
    end if;
  end if;

  return new;
end
$$;
```

Apply it before update/delete on `workshop_manifests`. A separate entry guard should prevent editing entries when their parent manifest is approved or superseded.

Recommended entry guard:

```sql
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
    return coalesce(new, old);
  end if;

  if not app_private.domain_is_platform_admin() then
    raise exception 'workshop manifest entry changes require platform admin access';
  end if;

  select manifest.status
  into parent_status
  from public.workshop_manifests as manifest
  where manifest.id = coalesce(new.manifest_id, old.manifest_id);

  if parent_status in ('approved', 'superseded') then
    raise exception 'approved or superseded workshop manifest entries are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end
$$;
```

## RLS Policy Contract

Enable RLS:

```sql
alter table public.workshop_manifests enable row level security;
alter table public.workshop_manifest_entries enable row level security;
```

Read policy:

```sql
create policy "platform admins read workshop manifests"
on public.workshop_manifests for select to authenticated
using (app_private.domain_is_platform_admin());

create policy "platform admins read workshop manifest entries"
on public.workshop_manifest_entries for select to authenticated
using (app_private.domain_is_platform_admin());
```

Write policy:

```sql
create policy "platform admins manage workshop manifests"
on public.workshop_manifests for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());

create policy "platform admins manage workshop manifest entries"
on public.workshop_manifest_entries for all to authenticated
using (app_private.domain_is_platform_admin())
with check (app_private.domain_is_platform_admin());
```

Important:

- RLS limits access to platform admins.
- Trigger guards enforce approval account, immutability, and no-delete behavior.
- Server actions should still validate the same rules before writing.

## Grants

Follow the existing domain migration pattern:

```sql
grant select on public.workshop_manifests,
  public.workshop_manifest_entries to authenticated;

grant insert, update, delete on public.workshop_manifests,
  public.workshop_manifest_entries to authenticated;
```

RLS and triggers provide the actual access control.

## Server Action Contract

Recommended server actions should:

- require authenticated user context;
- require `profile.role = 'platform_admin'` or `account_role = 'platform_admin'`;
- resolve `visualization.hawks@gmail.com` to a profile ID before approval;
- reject personal data fields not needed for the manifest;
- reject individual tile-file entries;
- reject edits to approved or superseded manifests;
- create a superseding manifest instead of mutating approved records;
- write MinIO backup bucket/object metadata only for private backup locations;
- never use or expose service-role credentials.

## Validation Plan

Before applying this migration remotely:

- Review SQL locally.
- Apply to a local Supabase database.
- Verify RLS is enabled.
- Verify non-platform users cannot read or write manifests.
- Verify platform admins can create draft manifests and entries.
- Verify only `visualization.hawks@gmail.com` can be recorded as approver.
- Verify approved manifests cannot be edited or deleted by authenticated users.
- Verify entries under approved manifests cannot be edited or deleted.
- Verify audit rows are created for manifest and entry insert/update/delete attempts that succeed.
- Verify private MinIO backup metadata can be recorded without exposing credentials.

## Acceptance Criteria

The design is ready for migration drafting when:

- Table names and columns are accepted.
- Approval account behavior is accepted.
- Immutability and supersession behavior is accepted.
- Audit reuse through `admin_audit_log` is accepted.
- Platform-admin-only access is accepted.
- Entry types and verification JSON shape are accepted.
- Tile groups/prefixes are accepted instead of individual tile files.
- The local validation plan is accepted.

## Open Questions

1. Should `workshop_manifest_entries.destination_bucket` store the real private bucket name, or an opaque bucket alias?
2. Should `source_ref` and `destination_prefix` be encrypted, opaque, or plain internal references?
3. Should approved manifest deletion be blocked even for service-role/admin maintenance, or should service-role retain emergency cleanup ability?
4. Should the approval account be checked by email only, or should the migration require a configured profile ID constant after local inspection?
