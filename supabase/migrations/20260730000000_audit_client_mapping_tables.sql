-- Phase 3G-A: audit canonical legacy-client mapping table mutations.
--
-- This migration is additive. It does not change client compatibility behavior
-- or enable any new application write workflow.

create or replace function app_private.domain_audit_client_mapping_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  audit_old jsonb;
  audit_new jsonb;
  record_identity jsonb;
begin
  audit_old = case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  audit_new = case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;

  if tg_table_name = 'client_people' then
    record_identity = jsonb_build_object(
      'client_id',
      coalesce(audit_new -> 'client_id', audit_old -> 'client_id'),
      'person_id',
      coalesce(audit_new -> 'person_id', audit_old -> 'person_id')
    );
  elsif tg_table_name = 'client_organizations' then
    record_identity = jsonb_build_object(
      'client_id',
      coalesce(audit_new -> 'client_id', audit_old -> 'client_id'),
      'organization_id',
      coalesce(audit_new -> 'organization_id', audit_old -> 'organization_id')
    );
  else
    raise exception 'unsupported client mapping audit table: %.%',
      tg_table_schema,
      tg_table_name;
  end if;

  insert into public.admin_audit_log (
    actor_profile_id,
    action,
    table_schema,
    table_name,
    record_pk,
    old_data,
    new_data
  )
  values (
    auth.uid(),
    tg_op,
    tg_table_schema,
    tg_table_name,
    record_identity,
    audit_old,
    audit_new
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end
$$;

revoke all on function app_private.domain_audit_client_mapping_row()
  from public, anon, authenticated;

drop trigger if exists audit_client_people on public.client_people;
create trigger audit_client_people
after insert or update or delete on public.client_people
for each row execute function app_private.domain_audit_client_mapping_row();

drop trigger if exists audit_client_organizations on public.client_organizations;
create trigger audit_client_organizations
after insert or update or delete on public.client_organizations
for each row execute function app_private.domain_audit_client_mapping_row();
