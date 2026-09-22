-- Guarded non-destructive containment for the survey output taxonomy.
-- This restores the broader format constraint but does not rewrite normalized
-- values. Full data reversal requires the tested pre-apply backup.

begin;

do $$
begin
  if current_setting('app.output_type_containment', true)
       is distinct from 'confirmed' then
    raise exception
      'Set app.output_type_containment=confirmed after verifying the target';
  end if;
end
$$;

alter table public.survey_outputs
  drop constraint if exists survey_outputs_type_allowed;

alter table public.survey_outputs
  add constraint survey_outputs_type_format
  check (output_type ~ '^[a-z0-9_]+$');

commit;
