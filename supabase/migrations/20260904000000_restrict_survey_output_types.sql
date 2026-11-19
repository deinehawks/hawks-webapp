-- Restrict generic survey output records to the approved application taxonomy.
-- Unsupported historical values are retained in metadata before normalization.

begin;

do $$
declare
  metadata_conflict_count bigint;
  current_collision_count bigint;
begin
  select count(*)
  into metadata_conflict_count
  from public.survey_outputs
  where output_type not in (
      'orthomosaic', 'point_cloud', 'object_detection', 'other'
    )
    and metadata ? 'legacy_output_type'
    and metadata ->> 'legacy_output_type' is distinct from output_type;

  if metadata_conflict_count > 0 then
    raise exception
      'Cannot normalize survey output types: % rows have conflicting legacy_output_type metadata',
      metadata_conflict_count;
  end if;

  select count(*)
  into current_collision_count
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

  if current_collision_count > 0 then
    raise exception
      'Cannot normalize survey output types: % surveys would have multiple current other outputs',
      current_collision_count;
  end if;
end
$$;

update public.survey_outputs
set metadata = case
      when metadata ? 'legacy_output_type' then metadata
      else jsonb_set(
        metadata,
        '{legacy_output_type}',
        to_jsonb(output_type),
        true
      )
    end,
    output_type = 'other'
where output_type not in (
  'orthomosaic', 'point_cloud', 'object_detection', 'other'
);

alter table public.survey_outputs
  drop constraint if exists survey_outputs_type_format;

alter table public.survey_outputs
  add constraint survey_outputs_type_allowed
  check (
    output_type in (
      'orthomosaic', 'point_cloud', 'object_detection', 'other'
    )
  );

commit;
