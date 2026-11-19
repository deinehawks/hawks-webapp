-- Read-only inventory for platform-admin organization onboarding review.
-- Run against the confirmed non-production target before and after migration.

select jsonb_build_object(
  'database_name', current_database(),
  'captured_at', now(),
  'request_status_counts', (
    select coalesce(jsonb_object_agg(status, row_count), '{}'::jsonb)
    from (
      select status, count(*) as row_count
      from public.organization_user_requests
      group by status
    ) as summary
  ),
  'duplicate_pending_emails', (
    select count(*) from (
      select organization_id, requested_email
      from public.organization_user_requests
      where status = 'pending'
      group by organization_id, requested_email
      having count(*) > 1
    ) as duplicates
  ),
  'pending_for_inactive_organizations', (
    select count(*)
    from public.organization_user_requests as request
    join public.organizations as organization on organization.id = request.organization_id
    where request.status = 'pending' and organization.status <> 'active'
  ),
  'review_notes_column_exists', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organization_user_requests'
      and column_name = 'review_notes'
  ),
  'approve_rpc_exists',
    to_regprocedure('public.admin_approve_organization_user_request(uuid,text)') is not null,
  'reject_rpc_exists',
    to_regprocedure('public.admin_reject_organization_user_request(uuid,text)') is not null,
  'request_policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'policy', policyname, 'command', cmd, 'permissive', permissive
    ) order by policyname), '[]'::jsonb)
    from pg_policies
    where schemaname = 'public' and tablename = 'organization_user_requests'
  )
) as admin_onboarding_request_inventory;
