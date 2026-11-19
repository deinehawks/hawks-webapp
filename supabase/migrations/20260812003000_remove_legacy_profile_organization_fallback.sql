-- Remove live authorization fallback to legacy profiles.organization_id now that
-- app-side reads and local validation prefer membership/grant visibility.

create or replace function app_private.domain_has_legacy_client_access(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false
$$;

create or replace function app_private.domain_has_client_access(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.domain_is_platform_admin()
    or app_private.domain_has_client_membership_access(target_client_id)
$$;

create or replace function app_private.is_my_organization(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.domain_has_client_access(target_id)
$$;

create or replace function app_private.domain_can_read_survey(
  target_survey_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.domain_is_platform_admin()
    or exists (
      select 1
      from public.surveys as survey
      where survey.id = target_survey_id
        and app_private.domain_has_client_access(survey.client_id)
    )
    or exists (
      select 1
      from public.survey_organizations as survey_org
      join public.organization_memberships as membership
        on membership.organization_id = survey_org.organization_id
      where survey_org.survey_id = target_survey_id
        and survey_org.review_status = 'confirmed'
        and membership.profile_id = (select auth.uid())
        and membership.status = 'active'
    )
    or app_private.domain_has_survey_grant(target_survey_id)
$$;

drop policy if exists "users can read accessible profiles" on public.profiles;

create policy "users can read accessible profiles"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or app_private.domain_is_platform_admin()
  or exists (
    select 1
    from public.organization_memberships as caller_membership
    join public.organization_memberships as target_membership
      on target_membership.organization_id = caller_membership.organization_id
    where caller_membership.profile_id = (select auth.uid())
      and caller_membership.status = 'active'
      and caller_membership.role = 'org_admin'
      and target_membership.profile_id = profiles.id
      and target_membership.status in ('invited', 'pending', 'active', 'suspended')
  )
);
