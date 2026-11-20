-- Read-only verification for individual signup approval and grant-scoped
-- client visibility. Save operational output outside Git.

select constraint_name, check_clause
from information_schema.check_constraints
where constraint_schema = 'public'
  and constraint_name = 'account_signup_requests_review_shape_check';

select routine_schema, routine_name, data_type
from information_schema.routines
where routine_schema in ('public', 'app_private')
  and routine_name in (
    'admin_approve_individual_signup_request',
    'domain_has_granted_client_visibility'
  )
order by routine_schema, routine_name;

select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'admin_approve_individual_signup_request'
order by grantee, privilege_type;

select policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'clients'
  and policyname = 'tenant users can read accessible clients';

select
  count(*) filter (
    where status = 'approved'
      and organization_id is null
      and initial_role is null
  ) as approved_individual_requests,
  count(*) filter (
    where status = 'approved'
      and organization_id is not null
      and initial_role is not null
  ) as approved_organization_requests
from public.account_signup_requests;

select count(*) as approved_individuals_with_live_membership
from public.account_signup_requests as request
join public.organization_memberships as membership
  on membership.profile_id = request.profile_id
where request.status = 'approved'
  and request.organization_id is null
  and request.initial_role is null
  and membership.status in ('invited', 'pending', 'active', 'suspended');
