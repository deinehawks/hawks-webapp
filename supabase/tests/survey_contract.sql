begin;
create extension if not exists pgtap with schema extensions;

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
('24000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000000', 'authenticated',
 'authenticated', 'survey-contract-admin@example.test', '', now(), now(), now()),
('24000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000000', 'authenticated',
 'authenticated', 'survey-contract-user@example.test', '', now(), now(), now());

update public.profiles set role = 'platform_admin'
where id = '24000000-0000-0000-0000-000000000001';

insert into public.clients(id, code, name) values
('14000000-0000-0000-0000-000000000001', 'CONTRACT-A', 'Contract Client A');

insert into public.surveys(
  id, code, access_code, organization_code, client_id, location, status
) values (
  'survey-contract-a', 'CONTRACT-A', 'CONTRACT-A', 'CONTRACT-A',
  '14000000-0000-0000-0000-000000000001', 'Original location', 'draft'
);

select extensions.plan(8);
select extensions.has_function(
  'public', 'platform_admin_update_survey',
  array['text','text','date','numeric','text','text','text','mission_status'],
  'narrow platform-admin survey update RPC exists'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.surveys', 'UPDATE'),
  'authenticated sessions cannot update survey rows directly'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"24000000-0000-0000-0000-000000000001","role":"authenticated"}';

select extensions.lives_ok(
  $$select public.platform_admin_update_survey(
    'survey-contract-a', ' Updated location ', '2026-08-25', 12.5,
    ' AREA-A ', ' RGB ', ' Production ', 'completed'
  )$$,
  'platform admin updates the approved survey metadata fields'
);
select extensions.ok(
  (select location = 'Updated location'
      and flight_date = '2026-08-25'::date
      and area = 12.5
      and area_code = 'AREA-A'
      and type = 'RGB'
      and category = 'Production'
      and status = 'completed'
   from public.surveys where id = 'survey-contract-a'),
  'approved metadata changes are persisted'
);
select extensions.ok(
  (select code = 'CONTRACT-A'
      and access_code = 'CONTRACT-A'
      and organization_code = 'CONTRACT-A'
      and client_id = '14000000-0000-0000-0000-000000000001'
   from public.surveys where id = 'survey-contract-a'),
  'identity and client compatibility fields remain unchanged'
);
select extensions.throws_ok(
  $$update public.surveys set code = 'REWRITTEN' where id = 'survey-contract-a'$$,
  '42501', null,
  'platform admin cannot bypass the RPC with a direct table update'
);
select extensions.throws_ok(
  $$select public.platform_admin_update_survey(
    'survey-contract-a', null, null, -1, null, null, null, 'draft'
  )$$,
  '22023', 'survey area cannot be negative',
  'negative survey area is rejected'
);

set local request.jwt.claims =
  '{"sub":"24000000-0000-0000-0000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.platform_admin_update_survey(
    'survey-contract-a', null, null, null, null, null, null, 'draft'
  )$$,
  '42501', 'platform administrator access required',
  'ordinary users cannot call the survey update RPC'
);

select * from extensions.finish();
rollback;
