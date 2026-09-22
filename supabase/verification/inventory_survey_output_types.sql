-- Aggregate-only pre/post migration inventory for the survey output taxonomy.
-- This emits no survey identifiers, titles, storage buckets, or asset paths.

select jsonb_build_object(
  'total_outputs', count(*),
  'approved_type_outputs', count(*) filter (
    where output_type in (
      'orthomosaic', 'point_cloud', 'object_detection', 'other'
    )
  ),
  'unsupported_type_outputs', count(*) filter (
    where output_type not in (
      'orthomosaic', 'point_cloud', 'object_detection', 'other'
    )
  ),
  'preserved_legacy_values', count(*) filter (
    where metadata ? 'legacy_output_type'
  ),
  'conflicting_legacy_metadata', count(*) filter (
    where output_type not in (
        'orthomosaic', 'point_cloud', 'object_detection', 'other'
      )
      and metadata ? 'legacy_output_type'
      and metadata ->> 'legacy_output_type' is distinct from output_type
  )
) as survey_output_type_inventory
from public.survey_outputs;

select coalesce(
  jsonb_object_agg(output_type, row_count order by output_type),
  '{}'::jsonb
) as survey_output_type_counts
from (
  select output_type, count(*) as row_count
  from public.survey_outputs
  group by output_type
) as type_counts;

select jsonb_build_object(
  'normalization_current_collisions', count(*)
) as survey_output_current_collision_inventory
from (
  select survey_id
  from public.survey_outputs
  where is_current
    and (
      output_type = 'other'
      or output_type not in (
        'orthomosaic', 'point_cloud', 'object_detection', 'other'
      )
    )
  group by survey_id
  having count(*) > 1
) as collisions;

select jsonb_build_object(
  'allowed_constraint_exists', count(*) filter (
    where conname = 'survey_outputs_type_allowed'
  ) = 1,
  'allowed_constraint_validated', coalesce(bool_and(convalidated) filter (
    where conname = 'survey_outputs_type_allowed'
  ), false),
  'format_constraint_exists', count(*) filter (
    where conname = 'survey_outputs_type_format'
  ) > 0
) as survey_output_type_contract
from pg_constraint
where conrelid = 'public.survey_outputs'::regclass
  and conname in (
    'survey_outputs_type_allowed',
    'survey_outputs_type_format'
  );
