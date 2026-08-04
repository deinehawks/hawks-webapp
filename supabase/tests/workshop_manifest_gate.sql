begin;

create extension if not exists pgtap with schema extensions;

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
  ('20000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'visualization.hawks@gmail.com', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000102',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'manifest-admin@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000103',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'manifest-viewer@example.test', '', now(), now(), now());

update public.profiles
set role = 'platform_admin',
    account_role = 'platform_admin'
where id in (
  '20000000-0000-0000-0000-000000000101',
  '20000000-0000-0000-0000-000000000102'
);

update public.profiles
set role = 'viewer',
    account_role = 'individual'
where id = '20000000-0000-0000-0000-000000000103';

select extensions.plan(12);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000103","role":"authenticated"}';

select extensions.throws_ok(
  $$insert into public.workshop_manifests (manifest_key, title)
    values ('manifest-2026-09-15', 'viewer denied')$$,
  'P0001',
  'workshop manifest changes require platform admin access',
  'non-platform user cannot insert workshop manifest'
);

select extensions.results_eq(
  $$select count(*) from public.workshop_manifests$$,
  $$values (0::bigint)$$,
  'non-platform user cannot read workshop manifests'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000102","role":"authenticated"}';

insert into public.workshop_manifests (manifest_key, title)
values ('manifest-2026-09-15', 'Workshop Manifest Draft');

select extensions.results_eq(
  $$select created_by from public.workshop_manifests
    where manifest_key = 'manifest-2026-09-15'$$,
  $$values ('20000000-0000-0000-0000-000000000102'::uuid)$$,
  'manifest created_by defaults to current platform admin'
);

select extensions.throws_ok(
  $$update public.workshop_manifests
    set status = 'approved',
        approved_by = '20000000-0000-0000-0000-000000000102',
        is_active = true
    where manifest_key = 'manifest-2026-09-15'$$,
  'P0001',
  'workshop manifest approval requires the project lead account',
  'non-owner platform admin cannot approve manifest'
);

update public.workshop_manifests
set status = 'approved',
    approved_by = '20000000-0000-0000-0000-000000000101',
    is_active = true
where manifest_key = 'manifest-2026-09-15';

select extensions.is(
  (select status from public.workshop_manifests
    where manifest_key = 'manifest-2026-09-15'),
  'approved',
  'project lead account can approve manifest'
);

select extensions.ok(
  (select approved_at is not null from public.workshop_manifests
    where manifest_key = 'manifest-2026-09-15'),
  'approval timestamp is populated'
);

select extensions.throws_ok(
  $$update public.workshop_manifests
    set title = 'should not change'
    where manifest_key = 'manifest-2026-09-15'$$,
  'P0001',
  'approved or superseded workshop manifests are immutable',
  'approved manifest content is immutable'
);

select extensions.throws_ok(
  $$insert into public.workshop_manifest_entries (
      manifest_id,
      entry_type,
      reference_key
    )
    select id, 'tile_group', 'tiles/10/1/1.png'
    from public.workshop_manifests
    where manifest_key = 'manifest-2026-09-15'$$,
  'P0001',
  'approved or superseded workshop manifest entries are immutable',
  'approved manifest entries are immutable'
);

insert into public.workshop_manifests (
  manifest_key,
  title,
  supersedes_manifest_id
)
select 'manifest-2026-09-16',
       'Workshop Manifest Replacement',
       id
from public.workshop_manifests
where manifest_key = 'manifest-2026-09-15';

update public.workshop_manifests
set status = 'approved',
    approved_by = '20000000-0000-0000-0000-000000000101',
    is_active = false
where manifest_key = 'manifest-2026-09-16';

update public.workshop_manifests as old_manifest
set status = 'superseded',
    superseded_by_manifest_id = new_manifest.id
from public.workshop_manifests as new_manifest
where old_manifest.manifest_key = 'manifest-2026-09-15'
  and new_manifest.manifest_key = 'manifest-2026-09-16';

update public.workshop_manifests
set is_active = true
where manifest_key = 'manifest-2026-09-16';

select extensions.is(
  (select status from public.workshop_manifests
    where manifest_key = 'manifest-2026-09-15'),
  'superseded',
  'approved manifest can be superseded by approved replacement'
);

select extensions.results_eq(
  $$select count(*) from public.workshop_manifests
    where status = 'approved' and is_active$$,
  $$values (1::bigint)$$,
  'only one active approved manifest remains'
);

select extensions.ok(
  exists (
    select 1
    from public.admin_audit_log
    where table_name = 'workshop_manifests'
      and action in ('INSERT', 'UPDATE')
  ),
  'manifest changes are audited'
);

select extensions.throws_ok(
  $$insert into public.workshop_manifest_entries (
      manifest_id,
      entry_type,
      reference_key
    )
    select id, 'tile_group', 'tiles/11/2/3.png'
    from public.workshop_manifests
    where manifest_key = 'manifest-2026-09-16'$$,
  'P0001',
  'approved or superseded workshop manifest entries are immutable',
  'tile file entry cannot be added under approved manifest'
);

select * from extensions.finish();

rollback;