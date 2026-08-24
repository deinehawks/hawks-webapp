begin;

create extension if not exists pgtap with schema extensions;

insert into public.clients (id, code, name)
values
  ('10000000-0000-0000-0000-000000000011', 'DOM-A', 'Domain Client A'),
  ('10000000-0000-0000-0000-000000000012', 'DOM-B', 'Domain Client B'),
  ('10000000-0000-0000-0000-000000000013', 'DOM-C', 'Domain Client C');

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
set role = 'platform_admin'
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

select extensions.plan(43);

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
  0::bigint,
  'organization member receives no farm access from membership alone'
);

select extensions.is(
  (select count(*) from public.surveys),
  0::bigint,
  'organization member receives no survey access from membership alone'
);

select extensions.is(
  (select count(*) from public.survey_outputs),
  0::bigint,
  'organization member receives no output access from membership alone'
);

select extensions.is(
  (select count(*) from public.client_people),
  0::bigint,
  'organization member cannot read unrelated legacy person mappings'
);

select extensions.throws_ok(
  $$update public.profiles
    set role = 'platform_admin'
    where id = '20000000-0000-0000-0000-000000000013'$$,
  'P0001',
  null,
  'normal account cannot promote its platform role'
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

update public.farm_access_grants
set status = 'revoked'
where farm_id = '50000000-0000-0000-0000-000000000011'
  and profile_id = '20000000-0000-0000-0000-000000000015';

select extensions.is(
  (select status::text
   from public.farm_access_grants
   where farm_id = '50000000-0000-0000-0000-000000000011'
     and profile_id = '20000000-0000-0000-0000-000000000015'),
  'active',
  'ordinary user cannot revoke their own farm grant'
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

update public.survey_access_grants
set status = 'revoked'
where survey_id = 'domain-survey-a'
  and profile_id = '20000000-0000-0000-0000-000000000015';

select extensions.is(
  (select status::text
   from public.survey_access_grants
   where survey_id = 'domain-survey-a'
     and profile_id = '20000000-0000-0000-0000-000000000015'),
  'active',
  'ordinary user cannot revoke their own survey grant'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000013","role":"authenticated"}';

update public.organization_memberships
set role = 'org_admin'
where id = '40000000-0000-0000-0000-000000000012';

select extensions.is(
  (select role::text
   from public.organization_memberships
   where id = '40000000-0000-0000-0000-000000000012'),
  'member',
  'ordinary user cannot change their own membership role'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000012","role":"authenticated"}';

select extensions.throws_ok(
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
  '42501',
  null,
  'organization admin has no broad membership insert policy'
);

update public.organizations
set type_code = 'association'
where id = '30000000-0000-0000-0000-000000000011';

select extensions.is(
  (select type_code
   from public.organizations
   where id = '30000000-0000-0000-0000-000000000011'),
  'cooperative',
  'organization admin cannot change organization classification'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000012","role":"authenticated"}';

select extensions.throws_ok(
  $sql$select public.admin_confirm_client_organization_mapping(
      '10000000-0000-0000-0000-000000000011',
      '30000000-0000-0000-0000-000000000011',
      'org admin direct call attempt'
    )$sql$,
  '42501',
  null,
  'organization admin cannot call controlled client mapping rpc'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000012","role":"authenticated"}';

select extensions.throws_ok(
  $sql$insert into public.organization_memberships (
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
    )$sql$,
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
  $$update public.organization_memberships
    set role = 'org_admin',
        updated_at = now()
    where id = '40000000-0000-0000-0000-000000000012'$$,
  'platform admin can change an ordinary membership role'
);

select extensions.is(
  (select count(*) from public.admin_audit_log
   where table_name = 'organization_memberships'
     and action = 'UPDATE'
     and record_pk @> jsonb_build_object(
       'id', '40000000-0000-0000-0000-000000000012'
     )),
  1::bigint,
  'membership role update is audited'
);

select extensions.lives_ok(
  $$update public.survey_access_grants
    set status = 'revoked',
        revoked_by = '20000000-0000-0000-0000-000000000011',
        updated_at = now()
    where survey_id = 'domain-survey-a'
      and profile_id = '20000000-0000-0000-0000-000000000015'$$,
  'platform admin can revoke a survey grant'
);

select extensions.is(
  (select count(*) from public.admin_audit_log
   where table_name = 'survey_access_grants'
     and action = 'UPDATE'),
  1::bigint,
  'survey grant status update is audited'
);

select extensions.lives_ok(
  $$update public.farm_access_grants
    set status = 'revoked',
        revoked_by = '20000000-0000-0000-0000-000000000011',
        updated_at = now()
    where farm_id = '50000000-0000-0000-0000-000000000011'
      and profile_id = '20000000-0000-0000-0000-000000000015'$$,
  'platform admin can revoke a farm grant'
);

select extensions.is(
  (select count(*) from public.admin_audit_log
   where table_name = 'farm_access_grants'
     and action = 'UPDATE'),
  1::bigint,
  'farm grant status update is audited'
);

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

insert into public.client_organizations (
  client_id,
  organization_id,
  review_status,
  is_primary
)
values (
  '10000000-0000-0000-0000-000000000012',
  '30000000-0000-0000-0000-000000000012',
  'confirmed',
  true
);

select extensions.is(
  (select count(*) from public.admin_audit_log
   where table_name = 'client_organizations'
     and action = 'INSERT'
     and record_pk @> jsonb_build_object(
       'client_id', '10000000-0000-0000-0000-000000000012',
       'organization_id', '30000000-0000-0000-0000-000000000012'
     )),
  1::bigint,
  'client organization mapping insert is audited with composite identity'
);

update public.client_people
set notes = 'reviewed during audit coverage test'
where client_id = '10000000-0000-0000-0000-000000000011'
  and person_id = '35000000-0000-0000-0000-000000000011';

select extensions.is(
  (select count(*) from public.admin_audit_log
   where table_name = 'client_people'
     and action = 'UPDATE'
     and record_pk @> jsonb_build_object(
       'client_id', '10000000-0000-0000-0000-000000000011',
       'person_id', '35000000-0000-0000-0000-000000000011'
     )),
  1::bigint,
  'client person mapping update is audited with composite identity'
);

select extensions.lives_ok(
  $sql$select public.admin_confirm_client_organization_mapping(
      '10000000-0000-0000-0000-000000000012',
      '30000000-0000-0000-0000-000000000012',
      'confirmed through controlled rpc'
    )$sql$,
  'platform admin can confirm an existing client organization mapping'
);

select extensions.throws_ok(
  $sql$select public.admin_confirm_client_person_mapping(
      '10000000-0000-0000-0000-000000000012',
      '35000000-0000-0000-0000-000000000011',
      'conflicting mapping attempt'
    )$sql$,
  '23514',
  null,
  'controlled mapping rpc rejects conflicting canonical mapping type'
);

select extensions.lives_ok(
  $sql$select public.admin_create_organization_for_client_mapping(
      '10000000-0000-0000-0000-000000000013',
      'New Cooperative for RPC Test',
      'cooperative',
      'NEW-COOP-RPC',
      'created by controlled rpc',
      'mapped by controlled rpc'
    )$sql$,
  'platform admin can create and map a canonical organization'
);

select extensions.throws_ok(
  $sql$select public.admin_create_person_for_client_mapping(
      '10000000-0000-0000-0000-000000000013',
      'Conflicting Person RPC Test',
      null,
      null,
      null,
      null,
      'conflicting create and map attempt'
    )$sql$,
  '23514',
  null,
  'create and map person rpc rejects existing confirmed organization mapping'
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

select extensions.is(
  has_function_privilege(
    'authenticated',
    'app_private.domain_audit_client_mapping_row()',
    'EXECUTE'
  ),
  false,
  'authenticated role cannot execute client mapping audit trigger function'
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
