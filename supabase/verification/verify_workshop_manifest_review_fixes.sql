-- Verify Phase 3I-B review fixes after applying the workshop manifest gate
-- migrations in a non-production database.

-- EXPECT ONE ROW: active manifest column exists.
select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'workshop_manifests'
  and column_name = 'is_active';

-- EXPECT ONE ROW: unique active approved manifest index exists.
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'workshop_manifests'
  and indexname = 'workshop_manifests_one_active_approved_year_idx';

-- EXPECT TWO FUNCTIONS: final mutability guards exist.
select routine_schema, routine_name
from information_schema.routines
where routine_schema = 'app_private'
  and routine_name in (
    'enforce_workshop_manifest_mutability',
    'enforce_workshop_manifest_entry_mutability'
  )
order by routine_name;

-- EXPECT pgTAP behavior coverage file to be run separately:
-- supabase/tests/workshop_manifest_gate.sql
