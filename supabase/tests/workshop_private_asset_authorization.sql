begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(9);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
)
values
  ('26000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'visualization.hawks@gmail.com', '', now(), now(), now()),
  ('26000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'private-grantee@example.test', '', now(), now(), now()),
  ('26000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'private-unrelated@example.test', '', now(), now(), now());

update public.profiles
set role = 'platform_admin'
where id = '26000000-0000-0000-0000-000000000001';

insert into public.clients (id, code, name, classification_kind)
values (
  '26100000-0000-0000-0000-000000000001',
  'PRIVATE-CLIENT',
  'Private Client',
  'individual'
);

insert into public.people (id, display_name, status)
values (
  '26200000-0000-0000-0000-000000000001',
  'Private Client Contact',
  'active'
);

insert into public.client_people (
  client_id, person_id, relationship_type, review_status, is_primary
)
values (
  '26100000-0000-0000-0000-000000000001',
  '26200000-0000-0000-0000-000000000001',
  'owner',
  'confirmed',
  true
);

insert into public.surveys (
  id, code, access_code, client_id, status
)
values (
  'private-survey-2026',
  'PRIVATE-CLIENT',
  'PRIVATE-CLIENT',
  '26100000-0000-0000-0000-000000000001',
  'completed'
);

insert into public.survey_access_grants (
  survey_id, profile_id, organization_id, status, granted_by
)
values (
  'private-survey-2026',
  '26000000-0000-0000-0000-000000000002',
  null,
  'active',
  '26000000-0000-0000-0000-000000000001'
);

insert into public.workshop_manifests (
  id, manifest_key, status, dataset_year, approved_by, approved_at, is_active
)
values (
  '26300000-0000-0000-0000-000000000001',
  'manifest-2026-09-16',
  'approved',
  2026,
  '26000000-0000-0000-0000-000000000001',
  now(),
  true
);

insert into public.workshop_manifest_entries (
  manifest_id, entry_type, organization_id, client_id, survey_id,
  reference_key, destination_storage_alias, nginx_route_pattern,
  protection_level, metadata
)
values
  (
    '26300000-0000-0000-0000-000000000001',
    'tile_group',
    null,
    '26100000-0000-0000-0000-000000000001',
    'private-survey-2026',
    'private-client/2026/private-survey-2026/ortho/round-corners',
    'tiles',
    '/asimov-hawks/tiles/private-client/2026/private-survey-2026/ortho/round-corners/{z}/{x}/{y}.png',
    'private',
    '{}'::jsonb
  ),
  (
    '26300000-0000-0000-0000-000000000001',
    'point_cloud',
    null,
    '26100000-0000-0000-0000-000000000001',
    'private-survey-2026',
    'private-client/2026/private-survey-2026/point-clouds/odm.pcd',
    'pointclouds',
    '/asimov-hawks/3d/private-client/2026/private-survey-2026/odm.pcd',
    'private',
    '{}'::jsonb
  ),
  (
    '26300000-0000-0000-0000-000000000001',
    'tile_group',
    null,
    '26100000-0000-0000-0000-000000000001',
    'private-survey-2026',
    'private-client/2026/private-survey-2026/ortho/legacy-round-corners',
    'tiles',
    '/asimov-hawks/tiles/private-client/2026/private-survey-2026/ortho/legacy-round-corners/{z}/{x}/{y}.png',
    'organization',
    '{}'::jsonb
  );

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000002","role":"authenticated"}';

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026, 'tile_group', 'private-survey-2026',
      '/asimov-hawks/tiles/private-client/2026/private-survey-2026/ortho/round-corners/12/1/1.png'
    )$$,
  $$values (1::bigint)$$,
  'active null-organization survey grant authorizes private tiles'
);

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026, 'point_cloud', 'private-survey-2026',
      '/asimov-hawks/3d/private-client/2026/private-survey-2026/odm.pcd'
    )$$,
  $$values (1::bigint)$$,
  'active null-organization survey grant authorizes private point cloud'
);

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026, 'tile_group', 'private-survey-2026',
      '/asimov-hawks/tiles/private-client/2026/private-survey-2026/ortho/legacy-round-corners/12/1/1.png'
    )$$,
  $$values (1::bigint)$$,
  'legacy organization-labeled null-scope entry preserves survey-grant access'
);

set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000003","role":"authenticated"}';

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026, 'tile_group', 'private-survey-2026',
      '/asimov-hawks/tiles/private-client/2026/private-survey-2026/ortho/round-corners/12/1/1.png'
    )$$,
  $$values (0::bigint)$$,
  'unrelated user cannot authorize private assets'
);

set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000001","role":"authenticated"}';

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026, 'tile_group', 'private-survey-2026',
      '/asimov-hawks/tiles/private-client/2026/private-survey-2026/ortho/round-corners/12/1/1.png'
    )$$,
  $$values (1::bigint)$$,
  'platform admin can authorize private assets'
);

reset role;
update public.survey_access_grants
set expires_at = now() - interval '1 minute'
where survey_id = 'private-survey-2026';
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000002","role":"authenticated"}';

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026, 'tile_group', 'private-survey-2026',
      '/asimov-hawks/tiles/private-client/2026/private-survey-2026/ortho/round-corners/12/1/1.png'
    )$$,
  $$values (0::bigint)$$,
  'expired survey grant cannot authorize private assets'
);

reset role;
update public.survey_access_grants
set expires_at = null, status = 'revoked'
where survey_id = 'private-survey-2026';
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"26000000-0000-0000-0000-000000000002","role":"authenticated"}';

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026, 'tile_group', 'private-survey-2026',
      '/asimov-hawks/tiles/private-client/2026/private-survey-2026/ortho/round-corners/12/1/1.png'
    )$$,
  $$values (0::bigint)$$,
  'revoked survey grant cannot authorize private assets'
);

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026, 'tile_group', 'private-survey-2026',
      '/asimov-hawks/tiles/private-client/2026/private-survey-2026/ortho/other/12/1/1.png'
    )$$,
  $$values (0::bigint)$$,
  'unknown private route fails closed'
);

reset role;
set local request.jwt.claims = '{}';

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026, 'tile_group', 'private-survey-2026',
      '/asimov-hawks/tiles/private-client/2026/private-survey-2026/ortho/round-corners/12/1/1.png'
    )$$,
  $$values (0::bigint)$$,
  'anonymous request cannot authorize private assets'
);

select * from extensions.finish();

rollback;
