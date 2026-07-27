begin;

create extension if not exists pgtap with schema extensions;

insert into public.clients (id, code, name)
values
  ('10000000-0000-0000-0000-000000000001', 'ORG-A', 'Organization A'),
  ('10000000-0000-0000-0000-000000000002', 'ORG-B', 'Organization B');

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
set role = 'org_admin',
    organization_id = '10000000-0000-0000-0000-000000000001'
where id = '20000000-0000-0000-0000-000000000002';

update public.profiles
set role = 'editor',
    organization_id = '10000000-0000-0000-0000-000000000001'
where id = '20000000-0000-0000-0000-000000000003';

update public.profiles
set role = 'viewer',
    organization_id = '10000000-0000-0000-0000-000000000001'
where id = '20000000-0000-0000-0000-000000000004';

update public.profiles
set role = 'viewer',
    organization_id = '10000000-0000-0000-0000-000000000002'
where id = '20000000-0000-0000-0000-000000000005';

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

select extensions.plan(13);

set local role authenticated;

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000004","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.clients),
  1::bigint,
  'viewer reads only their organization'
);
select extensions.is(
  (select count(*) from public.surveys),
  1::bigint,
  'viewer reads only surveys in their organization'
);
select extensions.is(
  (select count(*) from public.profiles),
  1::bigint,
  'viewer reads only their own profile'
);
select extensions.throws_ok(
  $$update public.profiles
    set role = 'platform_admin'
    where id = '20000000-0000-0000-0000-000000000004'$$,
  'P0001'
);
delete from public.surveys where id = 'survey-a';
select extensions.is(
  (select count(*) from public.surveys where id = 'survey-a'),
  1::bigint,
  'viewer cannot delete a survey'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}';

select extensions.lives_ok(
  $$insert into public.surveys
    (id, code, access_code, organization_code, client_id)
    values (
      'editor-survey', 'ORG-A', 'ORG-A', 'ORG-A',
      '10000000-0000-0000-0000-000000000001'
    )$$,
  'editor can insert a survey in their organization'
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
delete from public.surveys where id = 'survey-a';
select extensions.is(
  (select count(*) from public.surveys where id = 'survey-a'),
  1::bigint,
  'editor cannot delete a survey'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}';

select extensions.lives_ok(
  $$update public.profiles
    set role = 'editor'
    where id = '20000000-0000-0000-0000-000000000004'$$,
  'organization admin can manage a member role in their organization'
);
select extensions.throws_ok(
  $$update public.profiles
    set role = 'platform_admin'
    where id = '20000000-0000-0000-0000-000000000004'$$,
  'P0001'
);
select extensions.throws_ok(
  $$update public.profiles
    set organization_id = '10000000-0000-0000-0000-000000000002'
    where id = '20000000-0000-0000-0000-000000000004'$$,
  'P0001'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000006","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.surveys),
  0::bigint,
  'pending viewer reads no tenant surveys'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.surveys),
  3::bigint,
  'platform administrator reads every survey'
);

select * from extensions.finish();
rollback;
