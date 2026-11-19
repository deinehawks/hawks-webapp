-- Verify Phase 3I-B workshop manifest gate schema, RLS, and audit hooks.
-- Run against a non-production database after applying the draft migration.

-- EXPECT TWO ROWS: manifest tables exist.
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'workshop_manifests',
    'workshop_manifest_entries'
  )
order by table_name;

-- EXPECT ZERO: manifest tables must have RLS enabled.
select relname as table_name
from pg_class
where relname in (
    'workshop_manifests',
    'workshop_manifest_entries'
  )
  and not relrowsecurity;

-- EXPECT FOUR POLICIES: read/manage policies on both tables.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'workshop_manifests',
    'workshop_manifest_entries'
  )
order by tablename, policyname;

-- EXPECT SIX TRIGGERS: mutability, updated_at, and audit coverage.
select event_object_table as table_name, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in (
    'workshop_manifests',
    'workshop_manifest_entries'
  )
order by table_name, trigger_name, event_manipulation;

-- EXPECT TWO FUNCTIONS: manifest mutability guards exist.
select routine_schema, routine_name
from information_schema.routines
where routine_schema = 'app_private'
  and routine_name in (
    'enforce_workshop_manifest_mutability',
    'enforce_workshop_manifest_entry_mutability'
  )
order by routine_name;

-- EXPECT GRANTS FOR authenticated, with RLS still limiting access.
select table_schema, table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in (
    'workshop_manifests',
    'workshop_manifest_entries'
  )
  and grantee = 'authenticated'
order by table_name, privilege_type;
