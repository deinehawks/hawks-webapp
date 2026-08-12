begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(7);

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
  ('20000000-0000-0000-0000-000000000201',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'visualization.hawks@gmail.com', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000202',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'asset-member@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000203',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'asset-cross-org@example.test', '', now(), now(), now());

insert into public.clients (id, code, name)
values
  ('30000000-0000-0000-0000-000000000201', 'asset-org-a', 'Asset Org A'),
  ('30000000-0000-0000-0000-000000000202', 'asset-org-b', 'Asset Org B');

insert into public.organizations (id, type_code, code, name)
values
  ('40000000-0000-0000-0000-000000000201',
   'cooperative', 'asset-org-a', 'Asset Organization A'),
  ('40000000-0000-0000-0000-000000000202',
   'cooperative', 'asset-org-b', 'Asset Organization B');

insert into public.organization_memberships (
  profile_id,
  organization_id,
  role,
  status,
  approved_at
)
values
  ('20000000-0000-0000-0000-000000000202',
   '40000000-0000-0000-0000-000000000201', 'viewer', 'active', now()),
  ('20000000-0000-0000-0000-000000000203',
   '40000000-0000-0000-0000-000000000202', 'viewer', 'active', now());

update public.profiles
set role = 'platform_admin'
where id = '20000000-0000-0000-0000-000000000201';

update public.profiles
set role = 'user',
    organization_id = '30000000-0000-0000-0000-000000000201'
where id = '20000000-0000-0000-0000-000000000202';

update public.profiles
set role = 'user',
    organization_id = '30000000-0000-0000-0000-000000000202'
where id = '20000000-0000-0000-0000-000000000203';

insert into public.surveys (
  id,
  client_id,
  organization_code,
  code,
  status
)
values (
  'asset-survey-2026',
  '30000000-0000-0000-0000-000000000201',
  'asset-org-a',
  'asset-org-a',
  'completed'
);

insert into public.workshop_manifests (
  id,
  manifest_key,
  status,
  dataset_year,
  approved_by,
  approved_at,
  is_active
)
values (
  '50000000-0000-0000-0000-000000000201',
  'manifest-2026-09-15',
  'approved',
  2026,
  '20000000-0000-0000-0000-000000000201',
  now(),
  true
);

insert into public.workshop_manifest_entries (
  manifest_id,
  entry_type,
  organization_id,
  client_id,
  survey_id,
  reference_key,
  destination_storage_alias,
  destination_prefix_alias,
  nginx_route_pattern,
  protection_level,
  metadata
)
values
  (
    '50000000-0000-0000-0000-000000000201',
    'tile_group',
    '40000000-0000-0000-0000-000000000201',
    '30000000-0000-0000-0000-000000000201',
    'asset-survey-2026',
    'org:asset-org-a/survey:asset-survey-2026/tiles:ortho-a',
    'workshop-protected-gis',
    'org:asset-org-a/survey:asset-survey-2026/tiles:ortho-a',
    '/asimov-hawks/tiles/asset-org-a/2026/asset-survey-2026/ortho/ortho-a/{z}/{x}/{y}.png',
    'organization',
    '{"object_path":"tiles/ortho-a"}'::jsonb
  ),
  (
    '50000000-0000-0000-0000-000000000201',
    'point_cloud',
    '40000000-0000-0000-0000-000000000201',
    '30000000-0000-0000-0000-000000000201',
    'asset-survey-2026',
    'org:asset-org-a/survey:asset-survey-2026/point-clouds:odm',
    'workshop-protected-gis',
    'org:asset-org-a/survey:asset-survey-2026/point-clouds',
    '/asimov-hawks/3d/asset-org-a/2026/asset-survey-2026/{file}',
    'organization',
    '{"object_path":"point-clouds/odm.pcd"}'::jsonb
  );

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000202","role":"authenticated"}';

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026,
      'tile_group',
      'asset-survey-2026',
      '/asimov-hawks/tiles/asset-org-a/2026/asset-survey-2026/ortho/ortho-a/10/1/1.png'
    )$$,
  $$values (1::bigint)$$,
  'active organization member can authorize a manifest tile asset'
);

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026,
      'point_cloud',
      'asset-survey-2026',
      '/asimov-hawks/3d/asset-org-a/2026/asset-survey-2026/odm.pcd'
    )$$,
  $$values (1::bigint)$$,
  'active organization member can authorize a manifest point cloud asset'
);

select extensions.results_eq(
  $$select count(*) from public.workshop_manifests$$,
  $$values (0::bigint)$$,
  'organization member still cannot broadly read manifest rows'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000203","role":"authenticated"}';

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026,
      'tile_group',
      'asset-survey-2026',
      '/asimov-hawks/tiles/asset-org-a/2026/asset-survey-2026/ortho/ortho-a/10/1/1.png'
    )$$,
  $$values (0::bigint)$$,
  'cross-organization member cannot authorize protected tile asset'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000201","role":"authenticated"}';

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026,
      'tile_group',
      'asset-survey-2026',
      '/asimov-hawks/tiles/asset-org-a/2026/asset-survey-2026/ortho/ortho-a/10/1/1.png'
    )$$,
  $$values (1::bigint)$$,
  'platform admin can authorize protected tile asset'
);

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026,
      'tile_group',
      'asset-survey-2026',
      '/asimov-hawks/tiles/asset-org-a/2026/asset-survey-2026/ortho/other/10/1/1.png'
    )$$,
  $$values (0::bigint)$$,
  'unknown protected asset route fails closed'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000201","role":"authenticated"}';

insert into public.workshop_manifests (
  id,
  manifest_key,
  status,
  dataset_year,
  approved_by,
  approved_at,
  is_active,
  supersedes_manifest_id
)
values (
  '50000000-0000-0000-0000-000000000202',
  'manifest-2026-09-16',
  'approved',
  2026,
  '20000000-0000-0000-0000-000000000201',
  now(),
  false,
  '50000000-0000-0000-0000-000000000201'
);

update public.workshop_manifests
set status = 'superseded',
    superseded_by_manifest_id = '50000000-0000-0000-0000-000000000202'
where id = '50000000-0000-0000-0000-000000000201';

select extensions.results_eq(
  $$select count(*) from public.authorize_workshop_protected_asset(
      2026,
      'tile_group',
      'asset-survey-2026',
      '/asimov-hawks/tiles/asset-org-a/2026/asset-survey-2026/ortho/ortho-a/10/1/1.png'
    )$$,
  $$values (0::bigint)$$,
  'inactive manifest fails closed'
);

select * from extensions.finish();

rollback;
