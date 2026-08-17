begin;

create extension if not exists pgtap with schema extensions;

insert into public.clients (id, code, name)
values ('71000000-0000-0000-0000-000000000001', 'OUTPUT-A', 'Output Test Client');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
)
values
  ('72000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'output-admin@example.test', '', now(), now(), now()),
  ('72000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'output-user@example.test', '', now(), now(), now());

update public.profiles
set role = 'platform_admin'
where id = '72000000-0000-0000-0000-000000000001';

insert into public.surveys (id, client_id, code, status)
values ('output-survey-a', '71000000-0000-0000-0000-000000000001', 'OUTPUT-SURVEY-A', 'completed');

insert into public.survey_outputs (
  id, survey_id, output_type, status, title,
  storage_bucket, storage_path, is_current
)
values
  ('73000000-0000-0000-0000-000000000001', 'output-survey-a', 'report', 'draft',
   'Draft with storage', 'reports', 'output-survey-a/report-v2.pdf', false),
  ('73000000-0000-0000-0000-000000000002', 'output-survey-a', 'report', 'ready',
   'Current report', 'reports', 'output-survey-a/report-v1.pdf', true),
  ('73000000-0000-0000-0000-000000000003', 'output-survey-a', 'map', 'draft',
   'Draft without storage', null, null, false),
  ('73000000-0000-0000-0000-000000000004', 'output-survey-a', 'published_report', 'published',
   'Published report', 'reports', 'output-survey-a/published.pdf', false),
  ('73000000-0000-0000-0000-000000000005', 'output-survey-a', 'archived_report', 'archived',
   'Archived report', 'reports', 'output-survey-a/archived.pdf', false),
  ('73000000-0000-0000-0000-000000000006', 'output-survey-a', 'map', 'draft',
   'Draft attach target', null, null, false);

select extensions.plan(20);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"72000000-0000-0000-0000-000000000002","role":"authenticated"}';

select extensions.throws_ok(
  $sql$select public.admin_set_current_survey_output(
    '73000000-0000-0000-0000-000000000001'
  )$sql$,
  '42501',
  null,
  'normal user cannot select a current output'
);

select extensions.is(
  (select count(*) from public.survey_outputs),
  0::bigint,
  'normal user cannot read outputs for an inaccessible survey'
);

set local request.jwt.claims =
  '{"sub":"72000000-0000-0000-0000-000000000001","role":"authenticated"}';

select extensions.throws_ok(
  $$update public.survey_outputs
    set status = 'approved'
    where id = '73000000-0000-0000-0000-000000000001'$$,
  'P0001',
  null,
  'draft output cannot skip ready status'
);

select extensions.throws_ok(
  $$update public.survey_outputs
    set status = 'ready'
    where id = '73000000-0000-0000-0000-000000000003'$$,
  'P0001',
  null,
  'output without storage references cannot become ready'
);

select extensions.lives_ok(
  $$update public.survey_outputs
    set storage_bucket = 'reports',
        storage_path = 'output-survey-a/map-v1.json'
    where id = '73000000-0000-0000-0000-000000000006'$$,
  'platform admin can attach storage references to an unlocked draft output'
);

select extensions.is(
  (select storage_bucket || '/' || storage_path
   from public.survey_outputs
   where id = '73000000-0000-0000-0000-000000000006'),
  'reports/output-survey-a/map-v1.json',
  'attached storage reference is stored on the draft output'
);

select extensions.throws_ok(
  $$update public.survey_outputs
    set storage_path = 'output-survey-a/published-v2.pdf'
    where id = '73000000-0000-0000-0000-000000000004'$$,
  'P0001',
  null,
  'published output storage reference is locked'
);

select extensions.lives_ok(
  $$update public.survey_outputs
    set status = 'ready'
    where id = '73000000-0000-0000-0000-000000000001'$$,
  'draft output with storage references can become ready'
);

select extensions.lives_ok(
  $sql$select public.admin_set_current_survey_output(
    '73000000-0000-0000-0000-000000000001'
  )$sql$,
  'platform admin can select an eligible current output'
);

select extensions.is(
  (select id
   from public.survey_outputs
   where survey_id = 'output-survey-a'
     and output_type = 'report'
     and is_current),
  '73000000-0000-0000-0000-000000000001'::uuid,
  'current selection atomically replaces the previous report'
);

select extensions.throws_ok(
  $sql$select public.admin_set_current_survey_output(
    '73000000-0000-0000-0000-000000000003'
  )$sql$,
  'P0001',
  null,
  'draft output cannot become current'
);

select extensions.lives_ok(
  $sql$select public.admin_set_current_survey_output(
    '73000000-0000-0000-0000-000000000002'
  )$sql$,
  'platform admin can reselect another ready output'
);

select extensions.lives_ok(
  $$update public.survey_outputs
    set status = 'draft'
    where id = '73000000-0000-0000-0000-000000000002'$$,
  'current ready output can return to draft'
);

select extensions.is(
  (select is_current
   from public.survey_outputs
   where id = '73000000-0000-0000-0000-000000000002'),
  false,
  'returning a current output to draft clears current selection'
);

select extensions.lives_ok(
  $sql$select public.admin_set_current_survey_output(
    '73000000-0000-0000-0000-000000000001'
  )$sql$,
  'platform admin can restore the eligible current output'
);

select extensions.throws_ok(
  $$update public.survey_outputs
    set title = 'Changed published title'
    where id = '73000000-0000-0000-0000-000000000004'$$,
  'P0001',
  null,
  'published output is locked'
);

select extensions.throws_ok(
  $$update public.survey_outputs
    set title = 'Changed archived title'
    where id = '73000000-0000-0000-0000-000000000005'$$,
  'P0001',
  null,
  'archived output is locked'
);

select extensions.lives_ok(
  $$update public.survey_outputs
    set status = 'approved'
    where id = '73000000-0000-0000-0000-000000000001'$$,
  'ready output can become approved'
);

select extensions.lives_ok(
  $$update public.survey_outputs
    set status = 'archived'
    where id = '73000000-0000-0000-0000-000000000001'$$,
  'approved output can become archived'
);

select extensions.is(
  (select is_current
   from public.survey_outputs
   where id = '73000000-0000-0000-0000-000000000001'),
  false,
  'archiving automatically clears current selection'
);

select * from extensions.finish();

rollback;
