begin;

create extension if not exists pgtap with schema extensions;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('26000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'publishing-admin@example.test', '', now(), now(), now()),
  ('26000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'publishing-member@example.test', '', now(), now(), now()),
  ('26000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'publishing-cross@example.test', '', now(), now(), now());

update public.profiles set role = 'platform_admin'
where id = '26000000-0000-0000-0000-000000000001';
update public.profiles set role = 'user'
where id in (
  '26000000-0000-0000-0000-000000000002',
  '26000000-0000-0000-0000-000000000003'
);

insert into public.organizations (id, type_code, code, name, status) values
  ('36000000-0000-4000-8000-000000000001',
   'cooperative', 'PUB-ORG', 'Publishing Organization', 'active'),
  ('36000000-0000-4000-8000-000000000002',
   'cooperative', 'CROSS-ORG', 'Cross Organization', 'active');
insert into public.clients (id, code, name, classification_kind) values
  ('16000000-0000-4000-8000-000000000001',
   'PUB-CLIENT', 'Publishing Client', 'organization');
insert into public.client_organizations (
  client_id, organization_id, relationship_type, review_status, is_primary
) values (
  '16000000-0000-4000-8000-000000000001',
  '36000000-0000-4000-8000-000000000001',
  'legacy_client', 'confirmed', true
);
insert into public.organization_memberships (
  profile_id, organization_id, role, status, approved_at
) values
  ('26000000-0000-0000-0000-000000000002',
   '36000000-0000-4000-8000-000000000001', 'member', 'active', now()),
  ('26000000-0000-0000-0000-000000000003',
   '36000000-0000-4000-8000-000000000002', 'member', 'active', now());

insert into public.surveys (
  id, client_id, code, access_code, status, ortho, point_cloud
) values
  ('PUB-SURVEY-ORTHO', '16000000-0000-4000-8000-000000000001',
   'PUB-CLIENT', 'PUB-CLIENT', 'completed', null, null),
  ('PUB-SURVEY-PCD', '16000000-0000-4000-8000-000000000001',
   'PUB-CLIENT', 'PUB-CLIENT', 'completed', null, null);
insert into public.survey_organizations (
  survey_id, organization_id, relationship_type, review_status
) values
  ('PUB-SURVEY-ORTHO', '36000000-0000-4000-8000-000000000001',
   'participant', 'confirmed'),
  ('PUB-SURVEY-PCD', '36000000-0000-4000-8000-000000000001',
   'participant', 'confirmed');
insert into public.survey_access_grants (
  survey_id, profile_id, organization_id, status, granted_by
) values
  ('PUB-SURVEY-ORTHO', '26000000-0000-0000-0000-000000000002',
   '36000000-0000-4000-8000-000000000001', 'active',
   '26000000-0000-0000-0000-000000000001'),
  ('PUB-SURVEY-PCD', '26000000-0000-0000-0000-000000000002',
   '36000000-0000-4000-8000-000000000001', 'active',
   '26000000-0000-0000-0000-000000000001');

insert into public.orthos (id, survey_id, tile_folder, is_current)
values ('PUB-ORTHO', 'PUB-SURVEY-ORTHO', 'round-corners', true);
insert into public.point_clouds (code, survey_id, num_points, is_current)
values ('PUB-PCD', 'PUB-SURVEY-PCD', 1000, true);
update public.surveys set ortho = 'PUB-ORTHO'
where id = 'PUB-SURVEY-ORTHO';
update public.surveys set point_cloud = 'PUB-PCD'
where id = 'PUB-SURVEY-PCD';

insert into public.survey_outputs (
  id, survey_id, output_type, status, storage_bucket, storage_path, is_current
) values
  ('76000000-0000-4000-8000-000000000001', 'PUB-SURVEY-ORTHO',
   'orthomosaic', 'approved', 'tiles',
   'pub-client/2027/PUB-SURVEY-ORTHO/ortho/round-corners', true),
  ('76000000-0000-4000-8000-000000000002', 'PUB-SURVEY-PCD',
   'point_cloud', 'approved', 'pointclouds',
   'pub-client/2027/PUB-SURVEY-PCD/point-clouds/model.pcd', true);

insert into public.workshop_manifests (
  id, manifest_key, status, dataset_year, approved_by, approved_at, is_active
) values (
  '56000000-0000-4000-8000-000000000001',
  'manifest-2027-01-01', 'approved', 2027,
  '26000000-0000-0000-0000-000000000001', now(), true
);
insert into public.workshop_manifest_entries (
  manifest_id, entry_type, organization_id, client_id, survey_id,
  reference_key, destination_storage_alias, nginx_route_pattern,
  protection_level, metadata
) values (
  '56000000-0000-4000-8000-000000000001', 'point_cloud',
  '36000000-0000-4000-8000-000000000001',
  '16000000-0000-4000-8000-000000000001', 'PUB-SURVEY-PCD',
  'pub-client/2027/PUB-SURVEY-PCD/point-clouds/model.pcd',
  'pointclouds',
  '/asimov-hawks/3d/pub-client/2027/PUB-SURVEY-PCD/model.pcd',
  'platform_admin',
  '{"client_code":"pub-client","file_name":"model.pcd","bytes":5368709120}'::jsonb
), (
  '56000000-0000-4000-8000-000000000001', 'tile_group',
  '36000000-0000-4000-8000-000000000001',
  '16000000-0000-4000-8000-000000000001', 'PUB-SURVEY-ORTHO',
  'pub-client/2027/PUB-SURVEY-ORTHO/ortho/round-corners',
  'tiles',
  '/asimov-hawks/tiles/pub-client/2027/PUB-SURVEY-ORTHO/ortho/round-corners/{z}/{x}/{y}.png',
  'platform_admin',
  '{"client_code":"pub-client","tile_folder":"round-corners","min_zoom":11,"max_zoom":24,"tile_extent":[125.1,7.1,125.2,7.2]}'::jsonb
);

select extensions.plan(34);

select extensions.has_table(
  'public', 'survey_output_publications',
  'output publication table exists'
);
select extensions.has_function(
  'public', 'platform_admin_save_output_publication',
  array['uuid','integer','text','integer','integer','jsonb','text','bigint','text'],
  'platform-admin draft RPC exists'
);
select extensions.has_function(
  'public', 'service_verify_output_publication',
  array['uuid','jsonb','text','text'],
  'service verification RPC exists'
);
select extensions.has_function(
  'public', 'platform_admin_publish_output', array['uuid'],
  'platform-admin publish RPC exists'
);
select extensions.has_function(
  'public', 'list_authorized_published_survey_assets', array[]::text[],
  'authorized discovery RPC exists'
);
select extensions.ok(
  not has_table_privilege('authenticated','public.survey_output_publications','INSERT'),
  'authenticated sessions cannot insert publication rows directly'
);
select extensions.ok(
  not has_table_privilege('authenticated','public.survey_output_publications','UPDATE'),
  'authenticated sessions cannot update publication rows directly'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.service_verify_output_publication(uuid,jsonb,text,text)',
    'EXECUTE'
  ),
  'authenticated sessions cannot execute service verification'
);
select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.list_authorized_published_survey_assets()',
    'EXECUTE'
  ),
  'anonymous sessions cannot discover published assets'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.platform_admin_save_output_publication(
    '76000000-0000-4000-8000-000000000001', 2027,
    'round-corners', 11, 24, '[125.1,7.1,125.2,7.2]'::jsonb
  )$$,
  '42501', 'platform administrator access required',
  'ordinary members cannot create publication drafts'
);

set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.platform_admin_publish_output(
    '76000000-0000-4000-8000-000000000001'
  )$$,
  '42501', 'platform administrator access required',
  'cross-organization users cannot publish outputs'
);

set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000001","role":"authenticated"}';
select extensions.is(
  (select count(*)
   from public.list_authorized_published_survey_assets()
   where survey_id = 'PUB-SURVEY-PCD'
     and source_kind = 'legacy_manifest'),
  1::bigint,
  'legacy active-manifest assets remain available to their permitted scope'
);
select extensions.lives_ok(
  $$select public.platform_admin_save_output_publication(
    '76000000-0000-4000-8000-000000000001', 2027,
    'round-corners', 11, 24, '[125.1,7.1,125.2,7.2]'::jsonb
  )$$,
  'platform admin creates an orthomosaic publication draft'
);
select extensions.is(
  (select status from public.survey_output_publications
   where output_id = '76000000-0000-4000-8000-000000000001'),
  'draft',
  'new publication starts as draft'
);
select extensions.is(
  (select route_pattern from public.survey_output_publications
   where output_id = '76000000-0000-4000-8000-000000000001'),
  '/asimov-hawks/tiles/pub-client/2027/PUB-SURVEY-ORTHO/ortho/round-corners/{z}/{x}/{y}.png',
  'orthomosaic route is generated from canonical relationships'
);
select extensions.is(
  (select protection_level from public.survey_output_publications
   where output_id = '76000000-0000-4000-8000-000000000001'),
  'organization',
  'publication protection is derived from canonical ownership'
);
select extensions.throws_ok(
  $$select public.platform_admin_publish_output(
    '76000000-0000-4000-8000-000000000001'
  )$$,
  'P0001', 'only verified output publications can be published',
  'unverified publication cannot be published'
);
select extensions.throws_ok(
  $$select public.platform_admin_save_output_publication(
    '76000000-0000-4000-8000-000000000002', 2027,
    null, null, null, null, 'model.pcd', 5368709121
  )$$,
  'P0001', 'point cloud must be between 1 byte and 5 GiB',
  'point clouds above 5 GiB are rejected'
);
select extensions.lives_ok(
  $$select public.platform_admin_save_output_publication(
    '76000000-0000-4000-8000-000000000002', 2027,
    null, null, null, null, 'model.pcd', 5368709120
  )$$,
  'a point cloud at the 5 GiB limit is accepted'
);

reset role;
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
select extensions.throws_ok(
  $$select public.service_verify_output_publication(
    '76000000-0000-4000-8000-000000000001',
    '{"verified":true,"object_count":0,"total_bytes":100}'::jsonb,
    'test-pipeline', 'tiles-invalid'
  )$$,
  'P0001',
  'tile verification requires positive object_count and total_bytes',
  'empty tile verification fails closed'
);
select extensions.lives_ok(
  $$select public.service_verify_output_publication(
    '76000000-0000-4000-8000-000000000001',
    '{"verified":true,"object_count":12,"total_bytes":4096}'::jsonb,
    'test-pipeline', 'tiles-1'
  )$$,
  'service role verifies the tile delivery'
);
select extensions.is(
  public.service_verify_output_publication(
    '76000000-0000-4000-8000-000000000001',
    '{"verified":true,"object_count":12,"total_bytes":4096}'::jsonb,
    'test-pipeline', 'tiles-1'
  ),
  public.service_verify_output_publication(
    '76000000-0000-4000-8000-000000000001',
    '{"verified":true,"object_count":12,"total_bytes":4096}'::jsonb,
    'test-pipeline', 'tiles-1'
  ),
  'repeating the same verification run is idempotent'
);
select extensions.throws_ok(
  $$select public.service_verify_output_publication(
    '76000000-0000-4000-8000-000000000002',
    '{"verified":true,"bytes":5368709119}'::jsonb,
    'test-pipeline', 'pcd-invalid'
  )$$,
  'P0001',
  'point-cloud verification bytes do not match the publication draft',
  'point-cloud byte mismatch fails closed'
);

reset role;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000001","role":"authenticated"}';
select extensions.lives_ok(
  $$select public.platform_admin_publish_output(
    '76000000-0000-4000-8000-000000000001'
  )$$,
  'platform admin publishes a verified current orthomosaic'
);
select extensions.is(
  (select status from public.survey_output_publications
   where output_id = '76000000-0000-4000-8000-000000000001'),
  'published',
  'publication lifecycle records the published state'
);

set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*) from public.list_authorized_published_survey_assets()),
  1::bigint,
  'authorized member discovers the published output'
);
select extensions.is(
  (select route_template
   from public.list_authorized_published_survey_assets()),
  '/asimov-hawks/tiles/pub-client/2027/PUB-SURVEY-ORTHO/ortho/round-corners/{z}/{x}/{y}.png',
  'discovery returns the stable protected route'
);
select extensions.is(
  (select count(*) from public.authorize_workshop_protected_asset(
    2027, 'tile_group', 'PUB-SURVEY-ORTHO',
    '/asimov-hawks/tiles/pub-client/2027/PUB-SURVEY-ORTHO/ortho/round-corners/11/1/1.png'
  )),
  1::bigint,
  'authorized member can request a dynamic protected tile'
);
select extensions.is(
  (select count(*) from public.authorize_workshop_protected_asset(
    2027, 'tile_group', 'PUB-SURVEY-ORTHO',
    '/asimov-hawks/tiles/pub-client/2027/PUB-SURVEY-ORTHO/ortho/old/11/1/1.png'
  )),
  0::bigint,
  'a mismatched route fails closed once dynamic publication is present'
);
select extensions.is(
  (select count(*) from public.survey_output_publications),
  0::bigint,
  'members cannot read operational publication rows directly'
);

set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000003","role":"authenticated"}';
select extensions.is(
  (select count(*) from public.list_authorized_published_survey_assets()),
  0::bigint,
  'cross-organization user cannot discover the publication'
);
select extensions.is(
  (select count(*) from public.authorize_workshop_protected_asset(
    2027, 'tile_group', 'PUB-SURVEY-ORTHO',
    '/asimov-hawks/tiles/pub-client/2027/PUB-SURVEY-ORTHO/ortho/round-corners/11/1/1.png'
  )),
  0::bigint,
  'cross-organization asset request is denied'
);

set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000001","role":"authenticated"}';
select extensions.lives_ok(
  $$select public.platform_admin_retire_output_publication(
    '76000000-0000-4000-8000-000000000001'
  )$$,
  'platform admin retires a published delivery'
);
select extensions.is(
  (select count(*) from public.list_authorized_published_survey_assets()
   where survey_id = 'PUB-SURVEY-ORTHO'),
  0::bigint,
  'retired delivery disappears from discovery'
);

select * from extensions.finish();
rollback;
