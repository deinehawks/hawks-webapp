begin;
create extension if not exists pgtap with schema extensions;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('22000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'request-platform@example.test', '', now(), now(), now()),
  ('22000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'request-pending@example.test', '', now(), now(), now()),
  ('22000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'request-rejected@example.test', '', now(), now(), now());

update public.profiles set role = 'platform_admin'
where id = '22000000-0000-0000-0000-000000000001';
update public.profiles set account_status = 'pending'
where id in (
  '22000000-0000-0000-0000-000000000002',
  '22000000-0000-0000-0000-000000000003'
);

insert into public.organizations (id, type_code, code, name, status)
values ('32000000-0000-0000-0000-000000000001',
  'cooperative', 'REQUEST-ORG', 'Request Organization', 'active');

insert into public.account_signup_requests (id, profile_id, email)
values
  ('72000000-0000-0000-0000-000000000001',
   '22000000-0000-0000-0000-000000000002', 'request-pending@example.test'),
  ('72000000-0000-0000-0000-000000000002',
   '22000000-0000-0000-0000-000000000003', 'request-rejected@example.test');

select extensions.plan(11);
select extensions.has_column('public', 'profiles', 'account_status',
  'profiles track pending, active, and rejected application access');
select extensions.has_table('public', 'account_signup_requests',
  'user-created accounts enter a platform review queue');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"22000000-0000-0000-0000-000000000002","role":"authenticated"}';

select extensions.is(
  (select account_status from public.profiles
   where id = '22000000-0000-0000-0000-000000000002'),
  'pending', 'new request account remains pending before review');
select extensions.is(
  (select count(*) from public.account_signup_requests), 1::bigint,
  'pending user can read only their own signup request');
select extensions.throws_ok(
  $$update public.profiles set account_status = 'active'
    where id = '22000000-0000-0000-0000-000000000002'$$,
  'P0001',
  'role, person-link, and account-status changes are not permitted',
  'pending users cannot activate their own profile');
select extensions.throws_ok(
  $$select public.admin_approve_signup_request(
    '72000000-0000-0000-0000-000000000001',
    '32000000-0000-0000-0000-000000000001', 'member', null
  )$$,
  '42501', 'only platform admins can approve signup requests',
  'ordinary pending users cannot approve themselves');

reset role;
set local request.jwt.claims =
  '{"sub":"22000000-0000-0000-0000-000000000001","role":"authenticated"}';

select extensions.ok(
  public.admin_approve_signup_request(
    '72000000-0000-0000-0000-000000000001',
    '32000000-0000-0000-0000-000000000001', 'member', 'Approved test'
  ) is not null,
  'platform admin approval creates a membership atomically');
select extensions.is(
  (select account_status from public.profiles
   where id = '22000000-0000-0000-0000-000000000002'),
  'active', 'approval activates the application profile');
select extensions.is(
  (select role::text || ':' || status::text
   from public.organization_memberships
   where profile_id = '22000000-0000-0000-0000-000000000002'),
  'member:active', 'approval assigns the selected organization role');
select extensions.is(
  (select status from public.account_signup_requests
   where id = '72000000-0000-0000-0000-000000000001'),
  'approved', 'approval closes the request as approved');

select public.admin_reject_signup_request(
  '72000000-0000-0000-0000-000000000002', 'Rejected test');
select extensions.is(
  (select profile.account_status || ':' || request.status
   from public.profiles as profile
   join public.account_signup_requests as request
     on request.profile_id = profile.id
   where profile.id = '22000000-0000-0000-0000-000000000003'),
  'rejected:rejected',
  'rejection blocks the profile and closes the request');

select * from extensions.finish();
rollback;
