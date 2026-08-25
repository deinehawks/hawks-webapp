begin;

create extension if not exists pgtap with schema extensions;

insert into public.clients (id, code, name)
values
  ('10000000-0000-0000-0000-000000000001', 'ORG-A', 'Organization A'),
  ('10000000-0000-0000-0000-000000000002', 'ORG-B', 'Organization B');

insert into public.organizations (id, name, code, type_code, status)
values
  ('30000000-0000-0000-0000-000000000001', 'Org A', 'org-a', 'cooperative', 'active'),
  ('30000000-0000-0000-0000-000000000002', 'Org B', 'org-b', 'cooperative', 'active');

insert into public.client_organizations (
  client_id,
  organization_id,
  relationship_type,
  review_status,
  is_primary
)
values
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'owner', 'confirmed', true),
  ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'owner', 'confirmed', true);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
values
  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'platform@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'org-admin@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'editor@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'viewer@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'other-viewer@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'pending@example.test', '', now(), now(), now());

update public.profiles
set role = 'platform_admin'
where id = '20000000-0000-0000-0000-000000000001';

update public.profiles
set role = 'user'
where id in (
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000005'
);

insert into public.organization_memberships (
  organization_id,
  profile_id,
  role,
  status,
  invited_by,
  invited_at,
  approved_at,
  approved_by,
  notes
)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'org_admin', 'active', '20000000-0000-0000-0000-000000000001', now(), now(), '20000000-0000-0000-0000-000000000001', 'org admin'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'member', 'active', '20000000-0000-0000-0000-000000000001', now(), now(), '20000000-0000-0000-0000-000000000001', 'member'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'member', 'active', '20000000-0000-0000-0000-000000000001', now(), now(), '20000000-0000-0000-0000-000000000001', 'member'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', 'member', 'active', '20000000-0000-0000-0000-000000000001', now(), now(), '20000000-0000-0000-0000-000000000001', 'other member');

insert into public.surveys (
  id,
  code,
  access_code,
  organization_code,
  client_id,
  status
)
values
  ('survey-a', 'ORG-A', 'ORG-A', 'ORG-A',
   '10000000-0000-0000-0000-000000000001', 'completed'),
  ('survey-b', 'ORG-B', 'ORG-B', 'ORG-B',
   '10000000-0000-0000-0000-000000000002', 'completed');

select extensions.plan(12);

set local role authenticated;

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000004","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.clients),
  1::bigint,
  'member reads only the client shell linked to their organization'
);
select extensions.is(
  (select count(*) from public.surveys),
  0::bigint,
  'member receives no survey access from membership alone'
);
select extensions.is(
  (select count(*) from public.profiles),
  1::bigint,
  'member reads only their own profile'
);
select extensions.throws_ok(
  $$update public.profiles
    set role = 'platform_admin'
    where id = '20000000-0000-0000-0000-000000000004'$$,
  'P0001'
);
select extensions.is(
  (select count(*) from public.surveys where id = 'survey-a'),
  0::bigint,
  'member cannot read an ungranted survey'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}';

select extensions.throws_ok(
  $$insert into public.surveys
    (id, code, access_code, organization_code, client_id)
    values (
      'editor-survey', 'ORG-A', 'ORG-A', 'ORG-A',
      '10000000-0000-0000-0000-000000000001'
    )$$,
  '42501',
  null,
  'member cannot create a survey'
);
select extensions.throws_ok(
  $$insert into public.surveys
    (id, code, access_code, organization_code, client_id)
    values (
      'cross-tenant-survey', 'ORG-B', 'ORG-B', 'ORG-B',
      '10000000-0000-0000-0000-000000000002'
    )$$,
  '42501'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.profiles),
  3::bigint,
  'org admin reads profiles tied to their organization membership'
);
select extensions.throws_ok(
  $$update public.profiles
    set role = 'platform_admin'
    where id = '20000000-0000-0000-0000-000000000002'$$,
  'P0001'
);
select extensions.throws_ok(
  $$update public.profiles
    set person_id = '00000000-0000-0000-0000-000000000001'
    where id = '20000000-0000-0000-0000-000000000002'$$,
  'P0001'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000006","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.surveys),
  0::bigint,
  'user without membership reads no surveys'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.surveys),
  2::bigint,
  'platform administrator reads every survey'
);

select * from extensions.finish();
rollback;
