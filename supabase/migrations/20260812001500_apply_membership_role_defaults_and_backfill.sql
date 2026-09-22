-- Apply viewer/editor membership defaults, migrate legacy member rows, and
-- backfill canonical memberships after the expanded enum is committed.

alter table public.organization_memberships
  alter column role set default 'viewer';

update public.organization_memberships
set role = 'viewer'
where role = 'member';

create or replace function app_private.backfill_legacy_organization_memberships()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  bootstrap_platform_admin_id uuid;
  inserted_count integer := 0;
begin
  select profile.id
  into bootstrap_platform_admin_id
  from public.profiles as profile
  where profile.role = 'platform_admin'
  order by profile.created_at asc nulls first, profile.id asc
  limit 1;

  if bootstrap_platform_admin_id is null then
    return 0;
  end if;

  with confirmed_client_organizations as (
    select
      mapping.client_id,
      (array_agg(mapping.organization_id order by mapping.organization_id))[1] as organization_id
    from public.client_organizations as mapping
    where mapping.review_status = 'confirmed'
    group by mapping.client_id
    having count(distinct mapping.organization_id) = 1
  ),
  eligible_profiles as (
    select
      profile.id as profile_id,
      confirmed.organization_id,
      case
        when profile.role = 'org_admin' then 'org_admin'::public.membership_role
        when profile.role = 'editor' then 'editor'::public.membership_role
        else 'viewer'::public.membership_role
      end as membership_role
    from public.profiles as profile
    join confirmed_client_organizations as confirmed
      on confirmed.client_id = profile.organization_id
    where profile.role <> 'platform_admin'
      and profile.organization_id is not null
      and not exists (
        select 1
        from public.organization_memberships as membership
        where membership.profile_id = profile.id
      )
  )
  insert into public.organization_memberships (
    profile_id,
    organization_id,
    role,
    status,
    invited_by,
    approved_by,
    invited_at,
    approved_at,
    notes,
    created_at,
    updated_at
  )
  select
    eligible.profile_id,
    eligible.organization_id,
    eligible.membership_role,
    'active',
    bootstrap_platform_admin_id,
    bootstrap_platform_admin_id,
    now(),
    now(),
    'Backfilled from legacy profiles.organization_id during membership-role expansion.',
    now(),
    now()
  from eligible_profiles as eligible;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end
$$;

revoke all on function app_private.backfill_legacy_organization_memberships()
  from public, anon, authenticated;

drop policy if exists "organization admins manage ordinary members"
on public.organization_memberships;

create policy "organization admins manage ordinary members"
on public.organization_memberships for all to authenticated
using (
  app_private.domain_can_admin_organization(organization_id)
  and role in ('viewer', 'editor')
)
with check (
  app_private.domain_can_admin_organization(organization_id)
  and role in ('viewer', 'editor')
);

select app_private.backfill_legacy_organization_memberships();
