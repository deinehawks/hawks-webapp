-- Read-only affected-data and contract inventory for the Organization Admin portal.
-- Run against the confirmed non-production target before and after migration apply.
-- The single structured result is compatible with `supabase db query`.

select jsonb_build_object(
  'database_name', current_database(),
  'captured_at', now(),
  'membership_counts', (
    select coalesce(jsonb_agg(to_jsonb(summary) order by summary.organization_status, summary.membership_role, summary.membership_status), '[]'::jsonb)
    from (
      select o.status::text as organization_status, m.role::text as membership_role,
             m.status::text as membership_status, count(*) as row_count
      from public.organization_memberships as m
      join public.organizations as o on o.id = m.organization_id
      group by o.status, m.role, m.status
    ) as summary
  ),
  'active_org_admin_accounts', (
    select count(distinct m.profile_id)
    from public.organization_memberships as m
    join public.organizations as o on o.id = m.organization_id
    join public.profiles as p on p.id = m.profile_id
    where m.role = 'org_admin' and m.status = 'active'
      and o.status = 'active' and p.account_status = 'active'
  ),
  'org_admin_accounts_without_exactly_one_active_org', (
    select count(*) from (
      select m.profile_id
      from public.organization_memberships as m
      join public.organizations as o on o.id = m.organization_id
      join public.profiles as p on p.id = m.profile_id
      where m.role = 'org_admin' and m.status = 'active'
        and o.status = 'active' and p.account_status = 'active'
      group by m.profile_id having count(*) <> 1
    ) as invalid_admins
  ),
  'farm_relationship_counts', (
    select coalesce(jsonb_agg(to_jsonb(summary) order by summary.review_status, summary.relationship_type), '[]'::jsonb)
    from (select review_status::text, relationship_type::text, count(*) as row_count
          from public.farm_organizations group by review_status, relationship_type) as summary
  ),
  'survey_relationship_counts', (
    select coalesce(jsonb_agg(to_jsonb(summary) order by summary.review_status, summary.relationship_type), '[]'::jsonb)
    from (select review_status::text, relationship_type::text, count(*) as row_count
          from public.survey_organizations group by review_status, relationship_type) as summary
  ),
  'farm_grant_counts', (
    select coalesce(jsonb_agg(to_jsonb(summary) order by summary.grant_status), '[]'::jsonb)
    from (
      select g.status::text as grant_status, count(*) as row_count,
             count(*) filter (where g.organization_id is null) as platform_exceptions,
             count(*) filter (where g.organization_id is not null and not exists (
               select 1 from public.organization_memberships as m
               where m.organization_id = g.organization_id and m.profile_id = g.profile_id and m.status = 'active'
             )) as without_active_membership,
             count(*) filter (where g.organization_id is not null and not exists (
               select 1 from public.farm_organizations as fo
               where fo.organization_id = g.organization_id and fo.farm_id = g.farm_id and fo.review_status = 'confirmed'
             )) as without_confirmed_relationship
      from public.farm_access_grants as g group by g.status
    ) as summary
  ),
  'survey_grant_counts', (
    select coalesce(jsonb_agg(to_jsonb(summary) order by summary.grant_status), '[]'::jsonb)
    from (
      select g.status::text as grant_status, count(*) as row_count,
             count(*) filter (where g.organization_id is null) as platform_exceptions,
             count(*) filter (where g.organization_id is not null and not exists (
               select 1 from public.organization_memberships as m
               where m.organization_id = g.organization_id and m.profile_id = g.profile_id and m.status = 'active'
             )) as without_active_membership,
             count(*) filter (where g.organization_id is not null and not exists (
               select 1 from public.survey_organizations as so
               where so.organization_id = g.organization_id and so.survey_id = g.survey_id and so.review_status = 'confirmed'
             )) as without_confirmed_relationship
      from public.survey_access_grants as g group by g.status
    ) as summary
  ),
  'onboarding_request_counts', (
    select coalesce(jsonb_agg(to_jsonb(summary) order by summary.request_status), '[]'::jsonb)
    from (select status::text as request_status, count(*) as row_count
          from public.organization_user_requests group by status) as summary
  ),
  'function_contracts', (
    select jsonb_agg(jsonb_build_object('signature', expected.signature,
      'exists', to_regprocedure(expected.signature) is not null) order by expected.signature)
    from (values
      ('app_private.org_admin_organization_id()'),
      ('public.org_admin_update_organization(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text)'),
      ('public.org_admin_create_user_request(text,text,text)'), ('public.org_admin_cancel_user_request(uuid)'),
      ('public.org_admin_update_member_status(uuid,membership_status,text)'), ('public.org_admin_promote_member(uuid)'),
      ('public.org_admin_create_farm(text,text,text,text,numeric,text)'),
      ('public.org_admin_update_farm(uuid,text,text,text,text,numeric,text,text)'),
      ('public.org_admin_create_farm_grant(uuid,uuid,text)'),
      ('public.org_admin_set_farm_grant_status(uuid,access_grant_status,text)'),
      ('public.org_admin_create_survey_grant(uuid,text,text)'),
      ('public.org_admin_set_survey_grant_status(uuid,access_grant_status,text)'),
      ('public.org_admin_update_survey(text,text,date,numeric,text,text,text,mission_status)'),
      ('public.org_admin_update_output(uuid,text,text,text)')
    ) as expected(signature)
  ),
  'org_admin_policies', (
    select coalesce(jsonb_agg(jsonb_build_object('table', tablename, 'policy', policyname,
      'command', cmd, 'permissive', permissive) order by tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public'
      and (policyname in ('organization admins read organization farm grants',
        'organization admins read organization survey grants')
        or (tablename in ('organization_memberships', 'organization_user_requests')
          and policyname ilike '%organization admin%'))
  ),
  'audit_triggers', (
    select coalesce(jsonb_agg(jsonb_build_object('table', event_object_table,
      'trigger', trigger_name, 'timing', action_timing, 'event', event_manipulation)
      order by event_object_table, trigger_name, event_manipulation), '[]'::jsonb)
    from information_schema.triggers where trigger_schema = 'public'
      and trigger_name in ('audit_surveys', 'audit_farm_organizations')
  )
) as org_admin_portal_inventory;
