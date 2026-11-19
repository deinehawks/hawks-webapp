begin;
create extension if not exists pgtap with schema extensions;

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
('25000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dataset-admin@example.test','',now(),now(),now()),
('25000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dataset-user@example.test','',now(),now(),now()),
('25000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dataset-org-admin@example.test','',now(),now(),now());

update public.profiles set role = 'platform_admin'
where id = '25000000-0000-0000-0000-000000000001';

insert into public.organizations(id,type_code,code,name,status) values
('35000000-0000-4000-8000-000000000001','cooperative','DATA-ORG','Dataset Organization','active'),
('35000000-0000-4000-8000-000000000002','association','OTHER-ORG','Other Organization','active'),
('35000000-0000-4000-8000-000000000003','association','INACTIVE-ORG','Inactive Organization','inactive');
insert into public.organization_memberships(
  id, profile_id, organization_id, role, status
) values (
  '65000000-0000-4000-8000-000000000001',
  '25000000-0000-0000-0000-000000000003',
  '35000000-0000-4000-8000-000000000001',
  'org_admin', 'active'
);

insert into public.people(id,display_name,status) values
('45000000-0000-4000-8000-000000000001','Dataset Private Owner','active'),
('45000000-0000-4000-8000-000000000002','Other Private Owner','active');
insert into public.farms(id,code,name,status) values
('55000000-0000-4000-8000-000000000001','DATA-FARM','Dataset Organization Farm','active'),
('55000000-0000-4000-8000-000000000002','PRIVATE-FARM','Dataset Private Farm','active'),
('55000000-0000-4000-8000-000000000003','INACTIVE-FARM','Inactive Farm','inactive');
insert into public.farm_organizations(
  farm_id, organization_id, relationship_type, review_status
) values
(
  '55000000-0000-4000-8000-000000000001',
  '35000000-0000-4000-8000-000000000001',
  'owner', 'confirmed'
),
(
  '55000000-0000-4000-8000-000000000002',
  '35000000-0000-4000-8000-000000000001',
  'contact', 'confirmed'
);
insert into public.farm_people(
  farm_id, person_id, relationship_type, review_status
) values
(
  '55000000-0000-4000-8000-000000000002',
  '45000000-0000-4000-8000-000000000001',
  'owner', 'confirmed'
),
(
  '55000000-0000-4000-8000-000000000001',
  '45000000-0000-4000-8000-000000000001',
  'representative', 'confirmed'
);

insert into public.clients(id,code,name,classification_kind) values
('15000000-0000-4000-8000-000000000001','PRIVATE-CLIENT','Private Client','unclassified'),
('15000000-0000-4000-8000-000000000002','CONFLICT-CLIENT','Conflict Client','organization'),
('15000000-0000-4000-8000-000000000003','EXISTING-CLIENT','Existing Client','organization');
insert into public.client_organizations(
  client_id, organization_id, relationship_type, review_status, is_primary
) values (
  '15000000-0000-4000-8000-000000000003',
  '35000000-0000-4000-8000-000000000002',
  'legacy_client', 'confirmed', true
);
insert into public.surveys(id,code,access_code,client_id,status) values (
  'onboard-exists','EXISTING-CLIENT','EXISTING-CLIENT',
  '15000000-0000-4000-8000-000000000003','draft'
);

select extensions.plan(37);
select extensions.has_function(
  'public', 'platform_admin_preview_dataset_onboarding', array['jsonb'],
  'platform-admin onboarding preview RPC exists'
);
select extensions.has_function(
  'public', 'platform_admin_commit_dataset_onboarding', array['jsonb'],
  'platform-admin onboarding commit RPC exists'
);
select extensions.ok(
  not has_function_privilege('authenticated','app_private.validate_dataset_onboarding(jsonb)','EXECUTE'),
  'authenticated sessions cannot execute private validation directly'
);
select extensions.ok(
  not has_function_privilege('anon','public.platform_admin_preview_dataset_onboarding(jsonb)','EXECUTE'),
  'anonymous sessions cannot execute preview'
);
select extensions.ok(
  not has_function_privilege('anon','public.platform_admin_commit_dataset_onboarding(jsonb)','EXECUTE'),
  'anonymous sessions cannot execute commit'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"25000000-0000-0000-0000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.platform_admin_preview_dataset_onboarding('{}'::jsonb)$$,
  '42501', 'platform administrator access required',
  'ordinary users cannot preview onboarding'
);

set local request.jwt.claims =
  '{"sub":"25000000-0000-0000-0000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.platform_admin_commit_dataset_onboarding('{}'::jsonb)$$,
  '42501', 'platform administrator access required',
  'organization admins cannot commit onboarding'
);

set local request.jwt.claims =
  '{"sub":"25000000-0000-0000-0000-000000000001","role":"authenticated"}';

select extensions.ok(
  not (public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"new","code":"MISSING-LIST","name":"Missing List"},"ownership":{"kind":"organization","organizationId":"35000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000001"}'::jsonb
  )->>'valid')::boolean,
  'a missing survey ID list blocks direct RPC callers'
);

select extensions.ok(
  (public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"new","code":" data-new ","name":" Dataset New Client "},"ownership":{"kind":"organization","organizationId":"35000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000001","surveyIds":[" onboard-org-1 ","ONBOARD-ORG-2"]}'::jsonb
  )->>'valid')::boolean,
  'platform admin can preview a valid organization batch'
);
select extensions.is(
  (select count(*) from public.clients where code = 'DATA-NEW'), 0::bigint,
  'preview does not create the client'
);
select extensions.is(
  public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"new","code":"data-new","name":"Dataset New Client"},"ownership":{"kind":"organization","organizationId":"35000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000001","surveyIds":["onboard-org-1","ONBOARD-ORG-2"]}'::jsonb
  ) #>> '{normalized,surveyIds,0}',
  'ONBOARD-ORG-1',
  'preview normalizes survey identities'
);
select extensions.lives_ok(
  $$select public.platform_admin_commit_dataset_onboarding(
    '{"client":{"mode":"new","code":"data-new","name":"Dataset New Client"},"ownership":{"kind":"organization","organizationId":"35000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000001","surveyIds":["onboard-org-1","ONBOARD-ORG-2"]}'::jsonb
  )$$,
  'platform admin commits a valid organization batch'
);
select extensions.is(
  (select count(*) from public.surveys where id in ('ONBOARD-ORG-1','ONBOARD-ORG-2')),
  2::bigint, 'organization batch creates every survey'
);
select extensions.ok(
  (select bool_and(
    code = 'DATA-NEW' and access_code = 'DATA-NEW'
    and organization_code is null and status = 'draft'
  ) from public.surveys where id in ('ONBOARD-ORG-1','ONBOARD-ORG-2')),
  'created surveys preserve derived compatibility values and draft status'
);
select extensions.is(
  (select count(*) from public.survey_farms
   where survey_id in ('ONBOARD-ORG-1','ONBOARD-ORG-2')
     and farm_id = '55000000-0000-4000-8000-000000000001'
     and relationship_type = 'operator' and is_primary),
  2::bigint, 'organization surveys receive operator primary farm links'
);
select extensions.is(
  (select count(*) from public.survey_organizations
   where survey_id in ('ONBOARD-ORG-1','ONBOARD-ORG-2')
     and organization_id = '35000000-0000-4000-8000-000000000001'
     and relationship_type = 'requester' and review_status = 'confirmed'),
  2::bigint, 'organization surveys receive confirmed requester relationships'
);
select extensions.is(
  (select classification_kind::text from public.clients where code = 'DATA-NEW'),
  'organization', 'new client receives the organization classification'
);
select extensions.is(
  (select count(*) from public.client_organizations as mapping
   join public.clients as client on client.id = mapping.client_id
   where client.code = 'DATA-NEW'
     and mapping.organization_id = '35000000-0000-4000-8000-000000000001'
     and mapping.review_status = 'confirmed' and mapping.is_primary),
  1::bigint, 'new organization client receives a confirmed primary owner mapping'
);
select extensions.is(
  (select count(*) from public.admin_audit_log
   where action = 'DATASET_ONBOARDING_COMMIT'
     and metadata ->> 'client_code' = 'DATA-NEW'),
  1::bigint, 'organization batch writes one summary audit record'
);

select extensions.ok(
  (public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"existing","id":"15000000-0000-4000-8000-000000000001"},"ownership":{"kind":"private","personId":"45000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000002","surveyIds":["ONBOARD-PRIVATE-1","ONBOARD-PRIVATE-2"]}'::jsonb
  )->>'valid')::boolean,
  'platform admin can preview a valid private batch'
);
select extensions.lives_ok(
  $$select public.platform_admin_commit_dataset_onboarding(
    '{"client":{"mode":"existing","id":"15000000-0000-4000-8000-000000000001"},"ownership":{"kind":"private","personId":"45000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000002","surveyIds":["ONBOARD-PRIVATE-1","ONBOARD-PRIVATE-2"]}'::jsonb
  )$$,
  'platform admin commits a valid private batch'
);
select extensions.is(
  (select classification_kind::text from public.clients
   where id = '15000000-0000-4000-8000-000000000001'),
  'individual', 'existing unclassified client is explicitly classified'
);
select extensions.is(
  (select count(*) from public.client_people
   where client_id = '15000000-0000-4000-8000-000000000001'
     and person_id = '45000000-0000-4000-8000-000000000001'
     and review_status = 'confirmed' and is_primary),
  1::bigint, 'private client receives a confirmed primary owner mapping'
);
select extensions.is(
  (select count(*) from public.surveys
   where id in ('ONBOARD-PRIVATE-1','ONBOARD-PRIVATE-2')),
  2::bigint, 'private batch creates every survey'
);
select extensions.is(
  (select count(*) from public.survey_organizations
   where survey_id in ('ONBOARD-PRIVATE-1','ONBOARD-PRIVATE-2')),
  0::bigint, 'private surveys do not receive organization relationships'
);
select extensions.is(
  (select count(*) from public.survey_farms
   where survey_id in ('ONBOARD-PRIVATE-1','ONBOARD-PRIVATE-2')
     and farm_id = '55000000-0000-4000-8000-000000000002'
     and relationship_type = 'operator' and is_primary),
  2::bigint, 'private surveys receive operator primary farm links'
);

select extensions.ok(
  not (public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"existing","id":"15000000-0000-4000-8000-000000000001"},"ownership":{"kind":"private","personId":"45000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000002","surveyIds":["DUPLICATE-ID","duplicate-id"]}'::jsonb
  )->>'valid')::boolean,
  'duplicate IDs within a request block the batch'
);
select extensions.ok(
  not (public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"existing","id":"15000000-0000-4000-8000-000000000001"},"ownership":{"kind":"private","personId":"45000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000002","surveyIds":["ONBOARD-EXISTS"]}'::jsonb
  )->>'valid')::boolean,
  'an existing survey ID blocks the batch case-insensitively'
);
select extensions.ok(
  not (public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"new","code":"MISMATCH","name":"Mismatch"},"ownership":{"kind":"organization","organizationId":"35000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000002","surveyIds":["MISMATCH-1"]}'::jsonb
  )->>'valid')::boolean,
  'a confirmed organization contact relationship does not qualify the farm'
);
select extensions.ok(
  not (public.platform_admin_preview_dataset_onboarding(
    jsonb_build_object(
      'client', jsonb_build_object(
        'mode', 'existing',
        'id', '15000000-0000-4000-8000-000000000001'
      ),
      'ownership', jsonb_build_object(
        'kind', 'private',
        'personId', '45000000-0000-4000-8000-000000000001'
      ),
      'primaryFarmId', '55000000-0000-4000-8000-000000000001',
      'surveyIds', jsonb_build_array('REPRESENTATIVE-ONLY-1')
    )
  )->>'valid')::boolean,
  'a confirmed private representative relationship does not qualify the farm'
);
select extensions.ok(
  not (public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"existing","id":"15000000-0000-4000-8000-000000000002"},"ownership":{"kind":"private","personId":"45000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000002","surveyIds":["CLASS-CONFLICT-1"]}'::jsonb
  )->>'valid')::boolean,
  'a conflicting client classification blocks the batch'
);
select extensions.ok(
  not (public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"existing","id":"15000000-0000-4000-8000-000000000003"},"ownership":{"kind":"organization","organizationId":"35000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000001","surveyIds":["OWNER-CONFLICT-1"]}'::jsonb
  )->>'valid')::boolean,
  'a conflicting confirmed primary client owner blocks the batch'
);
select extensions.ok(
  not (public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"new","code":"INACTIVE-OWNER","name":"Inactive Owner"},"ownership":{"kind":"organization","organizationId":"35000000-0000-4000-8000-000000000003"},"primaryFarmId":"55000000-0000-4000-8000-000000000001","surveyIds":["INACTIVE-OWNER-1"]}'::jsonb
  )->>'valid')::boolean,
  'an inactive owner blocks the batch'
);
select extensions.ok(
  not (public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"new","code":"INACTIVE-FARM","name":"Inactive Farm"},"ownership":{"kind":"organization","organizationId":"35000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000003","surveyIds":["INACTIVE-FARM-1"]}'::jsonb
  )->>'valid')::boolean,
  'an inactive farm blocks the batch'
);
select extensions.ok(
  not (public.platform_admin_preview_dataset_onboarding(
    '{"client":{"mode":"new","code":"PRIVATE-CLIENT","name":"Duplicate Client"},"ownership":{"kind":"organization","organizationId":"35000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000001","surveyIds":["DUPLICATE-CLIENT-1"]}'::jsonb
  )->>'valid')::boolean,
  'a duplicate canonical client code blocks the batch'
);
select extensions.throws_ok(
  $$select public.platform_admin_commit_dataset_onboarding(
    '{"client":{"mode":"existing","id":"15000000-0000-4000-8000-000000000001"},"ownership":{"kind":"private","personId":"45000000-0000-4000-8000-000000000001"},"primaryFarmId":"55000000-0000-4000-8000-000000000002","surveyIds":["ONBOARD-ROLLBACK","ONBOARD-EXISTS"]}'::jsonb
  )$$,
  '22023', 'dataset onboarding validation failed',
  'commit repeats validation and rejects the whole conflicting batch'
);
select extensions.is(
  (select count(*) from public.surveys where id = 'ONBOARD-ROLLBACK'),
  0::bigint, 'a rejected commit creates no partial survey rows'
);

select * from extensions.finish();
rollback;
