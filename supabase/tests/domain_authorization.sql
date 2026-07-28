begin;

create extension if not exists pgtap with schema extensions;

insert into public.clients (id, code, name)
values
  ('10000000-0000-0000-0000-000000000011', 'DOM-A', 'Domain Client A'),
  ('10000000-0000-0000-0000-000000000012', 'DOM-B', 'Domain Client B');

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
  ('20000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'domain-platform@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000012',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'domain-org-admin@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000013',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'domain-member@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000014',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'domain-other-member@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000015',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'domain-grant@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000016',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'domain-pending@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000017',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'domain-escalation@example.test', '', now(), now(), now());

update public.profiles
set role = 'platform_admin',
    account_role = 'platform_admin'
where id = '20000000-0000-0000-0000-000000000011';

insert into public.organizations (id, type_code, code, name)
values
  ('30000000-0000-0000-0000-000000000011',
   'cooperative', 'COOP-A', 'Cooperative A'),
  ('30000000-0000-0000-0000-000000000012',
   'association', 'ASSOC-B', 'Association B');

insert into public.people (id, display_name)
values (
  '35000000-0000-0000-0000-000000000011',
  'Legacy Client Contact'
);

insert into public.client_people (
  client_id,
  person_id,
  review_status,
  is_primary
)
values (
  '10000000-0000-0000-0000-000000000011',
  '35000000-0000-0000-0000-000000000011',
  'confirmed',
  true
);

insert into public.organization_memberships (
  id,
  profile_id,
  organization_id,
  role,
  status
)
values
  ('40000000-0000-0000-0000-000000000011',
   '20000000-0000-0000-0000-000000000012',
   '30000000-0000-0000-0000-000000000011',
   'org_admin', 'active'),
  ('40000000-0000-0000-0000-000000000012',
   '20000000-0000-0000-0000-000000000013',
   '30000000-0000-0000-0000-000000000011',
   'member', 'active'),
  ('40000000-0000-0000-0000-000000000013',
   '20000000-0000-0000-0000-000000000014',
   '30000000-0000-0000-0000-000000000012',
   'member', 'active');

update public.organization_memberships
set approved_by = '20000000-0000-0000-0000-000000000011',
    approved_at = now()
where role = 'org_admin';

insert into public.surveys (
  id,
  code,
  access_code,
  organization_code,
  client_id,
  status
)
values
  ('domain-survey-a', 'DOM-A', 'DOM-A', 'DOM-A',
   '10000000-0000-0000-0000-000000000011', 'completed'),
  ('domain-survey-b', 'DOM-B', 'DOM-B', 'DOM-B',
   '10000000-0000-0000-0000-000000000012', 'completed'),
  ('domain-shared-survey', 'DOM-B', 'DOM-B', 'DOM-B',
   '10000000-0000-0000-0000-000000000012', 'completed');

insert into public.farms (id, code, name)
values
  ('50000000-0000-0000-0000-000000000011', 'FARM-A', 'Farm A'),
  ('50000000-0000-0000-0000-000000000012', 'FARM-B', 'Farm B');

insert into public.farm_organizations (
  farm_id,
  organization_id,
  relationship_type,
  review_status
)
values
  ('50000000-0000-0000-0000-000000000011',
   '30000000-0000-0000-0000-000000000011',
   'operator', 'confirmed'),
  ('50000000-0000-0000-0000-000000000012',
   '30000000-0000-0000-0000-000000000012',
   'operator', 'confirmed');

insert into public.farm_people (
  farm_id,
  person_id,
  relationship_type,
  review_status
)
values (
  '50000000-0000-0000-0000-000000000011',
  '35000000-0000-0000-0000-000000000011',
  'contact',
  'confirmed'
);

insert into public.survey_farms (
  survey_id,
  farm_id,
  relationship_type,
  is_primary
)
values
  ('domain-survey-a',
   '50000000-0000-0000-0000-000000000011',
   'participant', true),
  ('domain-shared-survey',
   '50000000-0000-0000-0000-000000000011',
   'participant', true);

insert into public.survey_organizations (
  survey_id,
  organization_id,
  relationship_type,
  review_status
)
values
  ('domain-survey-a',
   '30000000-0000-0000-0000-000000000011',
   'requester', 'confirmed'),
  ('domain-shared-survey',
   '30000000-0000-0000-0000-000000000011',
   'participant', 'confirmed');

insert into public.farm_access_grants (
  farm_id,
  profile_id,
  status,
  granted_by
)
values (
  '50000000-0000-0000-0000-000000000011',
  '20000000-0000-0000-0000-000000000015',
  'active',
  '20000000-0000-0000-0000-000000000011'
);

insert into public.survey_outputs (
  id,
  survey_id,
  output_type,
  status,
  title,
  is_current
)
values (
  '60000000-0000-0000-0000-000000000011',
  'domain-survey-a',
  'report',
  'ready',
  'Domain Survey A Report',
  true
);

select extensions.plan(26);

set local role authenticated;

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000013","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.organizations),
  1::bigint,
  'organization member reads only their active organization'
);

select extensions.is(
  (select count(*) from public.farms),
  1::bigint,
  'organization member reads farms linked to their organization'
);

select extensions.is(
  (select count(*) from public.surveys),
  2::bigint,
  'organization member reads surveys linked to their organization'
);

select extensions.is(
  (select count(*) from public.survey_outputs),
  1::bigint,
  'organization member reads outputs for accessible surveys'
);

select extensions.is(
  (select count(*) from public.client_people),
  0::bigint,
  'organization member cannot read unrelated legacy person mappings'
);

select extensions.throws_ok(
  $$update public.profiles
    set account_role = 'platform_admin'
    where id = '20000000-0000-0000-0000-000000000013'$$,
  'P0001',
  null,
  'normal account cannot promote its global account role'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000014","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.surveys),
  0::bigint,
  'other organization member cannot read unlinked surveys'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000015","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.farms),
  1::bigint,
  'explicit farm grant reads the farm'
);

select extensions.is(
  (select count(*) from public.farm_people),
  0::bigint,
  'explicit farm grant does not reveal farm people metadata'
);

select extensions.is(
  (select count(*) from public.farm_organizations),
  0::bigint,
  'explicit farm grant does not reveal organization relationships'
);

select extensions.is(
  (select count(*) from public.survey_farms),
  0::bigint,
  'explicit farm grant does not reveal survey relationships'
);

select extensions.is(
  (select count(*) from public.surveys),
  0::bigint,
  'farm grant does not imply survey access'
);

reset role;

insert into public.survey_access_grants (
  survey_id,
  profile_id,
  status,
  granted_by
)
values (
  'domain-survey-a',
  '20000000-0000-0000-0000-000000000015',
  'active',
  '20000000-0000-0000-0000-000000000011'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000015","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.surveys),
  1::bigint,
  'explicit survey grant reads only granted survey'
);

select extensions.is(
  (select count(*) from public.survey_outputs),
  1::bigint,
  'explicit survey grant reads that survey output'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000012","role":"authenticated"}';

select extensions.lives_ok(
  $$insert into public.organization_memberships (
      profile_id,
      organization_id,
      role,
      status
    )
    values (
      '20000000-0000-0000-0000-000000000016',
      '30000000-0000-0000-0000-000000000011',
      'member',
      'pending'
    )$$,
  'organization admin can add an ordinary member in their organization'
);

select extensions.throws_ok(
  $$update public.organizations
    set type_code = 'association'
    where id = '30000000-0000-0000-0000-000000000011'$$,
  'P0001',
  null,
  'organization admin cannot change organization classification'
);

select extensions.throws_ok(
  $$insert into public.organization_memberships (
      profile_id,
      organization_id,
      role,
      status
    )
    values (
      '20000000-0000-0000-0000-000000000017',
      '30000000-0000-0000-0000-000000000011',
      'org_admin',
      'pending'
    )$$,
  '42501',
  null,
  'organization admin cannot create another organization admin'
);

update public.clients
set classification_kind = 'organization'
where code = 'DOM-A';

select extensions.is(
  (select classification_kind::text
   from public.clients
   where code = 'DOM-A'),
  null::text,
  'organization admin cannot classify legacy clients'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000011","role":"authenticated"}';

select extensions.lives_ok(
  $$update public.clients
    set classification_kind = 'organization',
        classification_reviewed_by =
          '20000000-0000-0000-0000-000000000011',
        classification_reviewed_at = now()
    where code = 'DOM-A'$$,
  'platform admin can classify a legacy client'
);

select extensions.is(
  (select count(*) from public.admin_audit_log
   where table_name = 'clients'
     and action = 'UPDATE'),
  1::bigint,
  'client classification update is audited'
);

select extensions.throws_ok(
  $$insert into public.organization_memberships (
      profile_id,
      organization_id,
      role,
      status
    )
    values (
      '20000000-0000-0000-0000-000000000013',
      '30000000-0000-0000-0000-000000000012',
      'member',
      'active'
    )$$,
  '23505',
  null,
  'one normal account cannot hold a second live organization membership'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000016","role":"authenticated"}';

select extensions.is(
  (select count(*) from public.surveys),
  0::bigint,
  'pending individual reads no surveys'
);

select extensions.is(
  has_function_privilege(
    'anon',
    'app_private.domain_is_platform_admin()',
    'EXECUTE'
  ),
  false,
  'anonymous role cannot execute private authorization helpers'
);

select extensions.is(
  has_function_privilege(
    'authenticated',
    'app_private.domain_audit_row()',
    'EXECUTE'
  ),
  false,
  'authenticated role cannot execute trigger-only audit function'
);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select extensions.throws_ok(
  $$select app_private.domain_is_platform_admin()$$,
  '42501',
  null,
  'anonymous callers cannot invoke private authorization helpers'
);

select extensions.throws_ok(
  $$select count(*) from public.organizations$$,
  '42501',
  null,
  'anonymous users cannot read domain tables'
);

select * from extensions.finish();
rollback;
