begin;

create extension if not exists pgtap with schema extensions;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
)
values
  ('21000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'access-platform@example.test', '', now(), now(), now()),
  ('21000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'access-admin@example.test', '', now(), now(), now()),
  ('21000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'access-member@example.test', '', now(), now(), now());

update public.profiles
set role = 'platform_admin'
where id = '21000000-0000-0000-0000-000000000001';

insert into public.organizations (id, type_code, code, name, status)
values
  ('31000000-0000-0000-0000-000000000001',
   'cooperative', 'ACCESS-A', 'Access Organization A', 'active'),
  ('31000000-0000-0000-0000-000000000002',
   'association', 'ACCESS-B', 'Access Organization B', 'active');

insert into public.clients (id, code, name)
values
  ('11000000-0000-0000-0000-000000000001', 'ACCESS-A', 'Access Client A'),
  ('11000000-0000-0000-0000-000000000002', 'ACCESS-B', 'Access Client B');

insert into public.client_organizations (
  client_id, organization_id, relationship_type, review_status, is_primary
)
values
  ('11000000-0000-0000-0000-000000000001',
   '31000000-0000-0000-0000-000000000001', 'owner', 'confirmed', true),
  ('11000000-0000-0000-0000-000000000002',
   '31000000-0000-0000-0000-000000000002', 'owner', 'confirmed', true);

insert into public.organization_memberships (
  id, profile_id, organization_id, role, status, approved_by, approved_at
)
values
  ('41000000-0000-0000-0000-000000000001',
   '21000000-0000-0000-0000-000000000002',
   '31000000-0000-0000-0000-000000000001',
   'org_admin', 'active', '21000000-0000-0000-0000-000000000001', now()),
  ('41000000-0000-0000-0000-000000000002',
   '21000000-0000-0000-0000-000000000003',
   '31000000-0000-0000-0000-000000000001',
   'member', 'active', '21000000-0000-0000-0000-000000000001', now());

insert into public.farms (id, code, name)
values
  ('51000000-0000-0000-0000-000000000001', 'ACCESS-FARM-A', 'Access Farm A'),
  ('51000000-0000-0000-0000-000000000002', 'ACCESS-FARM-B', 'Access Farm B');

insert into public.farm_organizations (
  farm_id, organization_id, relationship_type, review_status
)
values
  ('51000000-0000-0000-0000-000000000001',
   '31000000-0000-0000-0000-000000000001', 'operator', 'confirmed'),
  ('51000000-0000-0000-0000-000000000002',
   '31000000-0000-0000-0000-000000000002', 'operator', 'confirmed');

insert into public.surveys (
  id, code, access_code, organization_code, client_id, status
)
values
  ('access-survey-a', 'ACCESS-A', 'ACCESS-A', 'ACCESS-A',
   '11000000-0000-0000-0000-000000000001', 'completed'),
  ('access-survey-b', 'ACCESS-B', 'ACCESS-B', 'ACCESS-B',
   '11000000-0000-0000-0000-000000000002', 'completed');

insert into public.survey_organizations (
  survey_id, organization_id, relationship_type, review_status
)
values
  ('access-survey-a', '31000000-0000-0000-0000-000000000001',
   'participant', 'confirmed'),
  ('access-survey-b', '31000000-0000-0000-0000-000000000002',
   'participant', 'confirmed');

insert into public.survey_outputs (
  id, survey_id, output_type, status, title, is_current
)
values
  ('61000000-0000-0000-0000-000000000001',
   'access-survey-a', 'orthomosaic', 'ready', 'Access Ortho A', true),
  ('61000000-0000-0000-0000-000000000002',
   'access-survey-b', 'orthomosaic', 'ready', 'Access Ortho B', true);

insert into public.farm_access_grants (
  farm_id, profile_id, organization_id, status, granted_by
)
values (
  '51000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000003',
  '31000000-0000-0000-0000-000000000001',
  'active',
  '21000000-0000-0000-0000-000000000001'
);

insert into public.survey_access_grants (
  survey_id, profile_id, organization_id, status, granted_by
)
values
  ('access-survey-a',
   '21000000-0000-0000-0000-000000000003',
   '31000000-0000-0000-0000-000000000001',
   'active', '21000000-0000-0000-0000-000000000001'),
  ('access-survey-b',
   '21000000-0000-0000-0000-000000000003',
   '31000000-0000-0000-0000-000000000002',
   'active', '21000000-0000-0000-0000-000000000001');

select extensions.plan(21);

select extensions.is(
  (select string_agg(enumlabel::text, ',' order by enumsortorder)
   from pg_enum
   where enumtypid = 'public.membership_role'::regtype),
  'org_admin,member',
  'membership role vocabulary contains only org_admin and member'
);

select extensions.has_column(
  'public', 'farm_access_grants', 'organization_id',
  'farm grants support organization scope'
);
select extensions.has_column(
  'public', 'survey_access_grants', 'organization_id',
  'survey grants support organization scope'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"21000000-0000-0000-0000-000000000003","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.farms), 1::bigint,
  'member sees only the explicitly granted farm'
);
select extensions.is(
  (select count(*) from public.surveys), 1::bigint,
  'member sees only the valid organization-scoped survey grant'
);
select extensions.is(
  (select count(*) from public.survey_outputs), 1::bigint,
  'survey grant exposes the granted survey output'
);
select extensions.is(
  (select count(*) from public.survey_organizations), 1::bigint,
  'membership does not reveal ungranted survey relationships'
);

set local request.jwt.claims =
  '{"sub":"21000000-0000-0000-0000-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.farms), 1::bigint,
  'organization admin manages confirmed organization farms'
);
select extensions.is(
  (select count(*) from public.surveys), 1::bigint,
  'organization admin manages confirmed organization surveys'
);
select extensions.is(
  (select count(*) from public.survey_organizations), 1::bigint,
  'organization admin sees confirmed organization survey relationships'
);

update public.organizations
set name = 'Unauthorized broad update'
where id = '31000000-0000-0000-0000-000000000001';

select extensions.is(
  (select name from public.organizations
   where id = '31000000-0000-0000-0000-000000000001'),
  'Access Organization A',
  'organization admin has no broad organization table-update policy'
);

set local request.jwt.claims =
  '{"sub":"21000000-0000-0000-0000-000000000003","role":"authenticated"}';
reset role;

update public.organization_memberships
set status = 'suspended'
where id = '41000000-0000-0000-0000-000000000002';

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"21000000-0000-0000-0000-000000000003","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.farms), 0::bigint,
  'suspension makes organization-scoped farm grants ineffective'
);
select extensions.is(
  (select count(*) from public.surveys), 0::bigint,
  'suspension makes organization-scoped survey grants ineffective'
);

reset role;
set local request.jwt.claims =
  '{"sub":"21000000-0000-0000-0000-000000000001","role":"authenticated"}';
update public.organization_memberships
set status = 'active'
where id = '41000000-0000-0000-0000-000000000002';

update public.organizations
set status = 'inactive'
where id = '31000000-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"21000000-0000-0000-0000-000000000003","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.farms), 0::bigint,
  'inactive organization blocks member farm grants'
);
select extensions.is(
  (select count(*) from public.surveys), 0::bigint,
  'inactive organization blocks member survey grants'
);

set local request.jwt.claims =
  '{"sub":"21000000-0000-0000-0000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*) from public.farms), 0::bigint,
  'inactive organization blocks organization-admin farm visibility'
);

reset role;
set local request.jwt.claims =
  '{"sub":"21000000-0000-0000-0000-000000000001","role":"authenticated"}';
update public.organizations
set status = 'active'
where id = '31000000-0000-0000-0000-000000000001';

update public.organization_memberships
set status = 'removed'
where id = '41000000-0000-0000-0000-000000000002';

select extensions.is(
  (select status::text
   from public.farm_access_grants
   where profile_id = '21000000-0000-0000-0000-000000000003'
     and organization_id = '31000000-0000-0000-0000-000000000001'),
  'revoked',
  'membership removal atomically revokes organization farm grants'
);
select extensions.is(
  (select status::text
   from public.survey_access_grants
   where profile_id = '21000000-0000-0000-0000-000000000003'
     and organization_id = '31000000-0000-0000-0000-000000000001'),
  'revoked',
  'membership removal atomically revokes organization survey grants'
);
select extensions.is(
  (select count(*) from public.admin_audit_log
   where table_name in ('farm_access_grants', 'survey_access_grants')
     and action = 'UPDATE'),
  2::bigint,
  'automatic grant revocations retain audit history'
);

insert into public.farm_access_grants (
  farm_id, profile_id, organization_id, status, granted_by
)
values (
  '51000000-0000-0000-0000-000000000002',
  '21000000-0000-0000-0000-000000000003',
  null,
  'active',
  '21000000-0000-0000-0000-000000000001'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"21000000-0000-0000-0000-000000000003","role":"authenticated"}';
select extensions.is(
  (select count(*) from public.farms), 1::bigint,
  'platform farm exception remains effective without membership'
);
reset role;

/* Superseded by user_first_signup_requests.sql. Retained temporarily as
historical evidence for the staging-applied pre-approval contract.
insert into public.account_signup_approvals (
  id, email, organization_id, initial_role, approved_by
)
values (
  '71000000-0000-0000-0000-000000000001',
  'approved-signup@example.test',
  '31000000-0000-0000-0000-000000000001',
  'member',
  '21000000-0000-0000-0000-000000000001'
);

select extensions.ok(
  app_private.domain_has_valid_signup_approval(
    'APPROVED-SIGNUP@example.test'
  ),
  'normalized approved email passes the private signup gate'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
)
values (
  '21000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'approved-signup@example.test', '', now(), now(), now()
);

update public.account_signup_approvals
set status = 'registered',
    registered_profile_id = '21000000-0000-0000-0000-000000000004'
where id = '71000000-0000-0000-0000-000000000001';

select extensions.is(
  (select role::text from public.profiles
   where id = '21000000-0000-0000-0000-000000000004'),
  'user',
  'approved signup creates a normal application profile'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"21000000-0000-0000-0000-000000000004","role":"authenticated"}';

select extensions.ok(
  public.claim_approved_signup() is not null,
  'confirmed approved account can claim its organization membership'
);
select extensions.is(
  (select role::text || ':' || status::text
   from public.organization_memberships
   where profile_id = '21000000-0000-0000-0000-000000000004'),
  'member:active',
  'claim creates the approved active membership'
);
select extensions.is(
  public.claim_approved_signup(),
  null::uuid,
  'claim is idempotent after the approval is closed'
);

reset role;
select extensions.is(
  (select status
   from public.account_signup_approvals
   where id = '71000000-0000-0000-0000-000000000001'),
  'claimed',
  'claim closes the signup approval'
);

insert into public.account_signup_approvals (
  id, email, organization_id, initial_role, approved_by, status, revoked_at
)
values (
  '71000000-0000-0000-0000-000000000002',
  'revoked-signup@example.test',
  '31000000-0000-0000-0000-000000000001',
  'member',
  '21000000-0000-0000-0000-000000000001',
  'revoked',
  now()
);

select extensions.is(
  app_private.domain_has_valid_signup_approval(
    'revoked-signup@example.test'
  ),
  false,
  'revoked approval fails the private signup gate'
);
*/

select extensions.is(
  has_function_privilege(
    'authenticated',
    'app_private.revoke_removed_membership_grants()',
    'EXECUTE'
  ),
  false,
  'authenticated users cannot execute the membership-removal trigger directly'
);

select * from extensions.finish();
rollback;
