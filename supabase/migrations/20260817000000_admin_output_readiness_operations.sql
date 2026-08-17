-- Output readiness guardrails and atomic current-output selection.

create or replace function app_private.enforce_survey_output_readiness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Preserve migration and trusted maintenance compatibility. Authenticated
  -- application writes remain constrained below and by RLS.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception 'new survey outputs must start as draft';
  end if;

  if tg_op = 'UPDATE' then
    if old.status in ('published', 'archived') then
      raise exception '% survey outputs are locked', old.status;
    end if;

    if new.status is distinct from old.status and not (
      (old.status = 'draft' and new.status = 'ready')
      or (old.status = 'ready' and new.status in ('draft', 'approved'))
      or (old.status = 'approved' and new.status = 'archived')
    ) then
      raise exception 'invalid survey output status transition from % to %',
        old.status, new.status;
    end if;
  end if;

  if new.status in ('ready', 'approved')
    and (
      nullif(btrim(coalesce(new.storage_bucket, '')), '') is null
      or nullif(btrim(coalesce(new.storage_path, '')), '') is null
    ) then
    raise exception 'ready or approved survey outputs require storage bucket and path';
  end if;

  if new.status = 'archived' then
    new.is_current := false;
  elsif tg_op = 'UPDATE' and old.is_current and new.status = 'draft' then
    new.is_current := false;
  end if;

  if new.is_current and new.status not in ('ready', 'approved') then
    raise exception 'only ready or approved survey outputs can be current';
  end if;

  return new;
end
$$;

drop trigger if exists enforce_survey_output_readiness
  on public.survey_outputs;

create trigger enforce_survey_output_readiness
before insert or update on public.survey_outputs
for each row execute function app_private.enforce_survey_output_readiness();

create or replace function public.admin_set_current_survey_output(
  target_output_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_output public.survey_outputs%rowtype;
begin
  if auth.uid() is null or not app_private.domain_is_platform_admin() then
    raise exception 'only platform admins can select the current survey output'
      using errcode = '42501';
  end if;

  select output.*
  into target_output
  from public.survey_outputs as output
  where output.id = target_output_id;

  if not found then
    raise exception 'survey output not found';
  end if;

  if target_output.status not in ('ready', 'approved') then
    raise exception 'only ready or approved survey outputs can be current';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_output.survey_id || ':' || target_output.output_type, 0)
  );

  update public.survey_outputs
  set is_current = false,
      updated_at = now()
  where survey_id = target_output.survey_id
    and output_type = target_output.output_type
    and is_current
    and id <> target_output.id;

  update public.survey_outputs
  set is_current = true,
      updated_at = now()
  where id = target_output.id;
end
$$;

revoke all on function public.admin_set_current_survey_output(uuid)
  from public, anon;

grant execute on function public.admin_set_current_survey_output(uuid)
  to authenticated;

