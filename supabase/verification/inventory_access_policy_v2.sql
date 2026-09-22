-- Read-only affected-data inventory for Access Policy v2.
-- Run against a confirmed local/staging target before migration apply.
-- Store output outside Git when it contains operational identifiers.

select current_database() as database_name, now() as captured_at;

select role::text as membership_role, status::text as membership_status,
       count(*) as row_count
from public.organization_memberships
group by role, status
order by role, status;

select id, profile_id, organization_id, role::text, status::text
from public.organization_memberships
where role::text in ('viewer', 'editor')
order by organization_id, profile_id;

select membership.organization_id,
       organization.status as organization_status,
       count(*) filter (where membership.status = 'active') as active_memberships,
       count(*) filter (where membership.status = 'suspended') as suspended_memberships
from public.organization_memberships as membership
join public.organizations as organization
  on organization.id = membership.organization_id
group by membership.organization_id, organization.status
order by membership.organization_id;

select status::text, count(*) as farm_grants
from public.farm_access_grants
group by status
order by status;

select status::text, count(*) as survey_grants
from public.survey_access_grants
group by status
order by status;

select review_status::text, count(*) as farm_relationships
from public.farm_organizations
group by review_status
order by review_status;

select review_status::text, count(*) as survey_relationships
from public.survey_organizations
group by review_status
order by review_status;

select tablename, policyname, cmd, permissive
from pg_policies
where schemaname = 'public'
  and tablename in (
    'surveys', 'orthos', 'point_clouds', 'survey_outputs',
    'farms', 'organization_memberships', 'profiles'
  )
order by tablename, policyname;
