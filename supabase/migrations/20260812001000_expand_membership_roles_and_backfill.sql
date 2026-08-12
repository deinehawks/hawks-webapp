-- Expand organization membership role enum to include viewer/editor using a
-- transaction-safe enum rebuild. Follow-up data/policy changes happen in the
-- next migration after this enum definition commits.

drop policy if exists "organization admins manage ordinary members"
on public.organization_memberships;

alter type public.membership_role rename to membership_role_old;

create type public.membership_role as enum (
  'org_admin',
  'member',
  'viewer',
  'editor'
);

alter table public.organization_memberships
  alter column role drop default;

alter table public.organization_memberships
  alter column role type public.membership_role
  using role::text::public.membership_role;

drop type public.membership_role_old;