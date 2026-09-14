insert into public.organizations (id, type_code, code, name, status)
select
  '39000000-0000-4000-8000-000000000001',
  'cooperative',
  'SMOKE-ORG',
  'Local Smoke Organization',
  'active'
where not exists (
  select 1 from public.organizations
  where id = '39000000-0000-4000-8000-000000000001'
);

insert into public.people (id, display_name, status)
select
  '49000000-0000-4000-8000-000000000001',
  'Local Smoke Private Owner',
  'active'
where not exists (
  select 1 from public.people
  where id = '49000000-0000-4000-8000-000000000001'
);

insert into public.farms (id, code, name, status)
select
  '59000000-0000-4000-8000-000000000001',
  'SMOKE-ORG-FARM',
  'Local Smoke Organization Farm',
  'active'
where not exists (
  select 1 from public.farms
  where id = '59000000-0000-4000-8000-000000000001'
);

insert into public.farms (id, code, name, status)
select
  '59000000-0000-4000-8000-000000000002',
  'SMOKE-PRIVATE-FARM',
  'Local Smoke Private Farm',
  'active'
where not exists (
  select 1 from public.farms
  where id = '59000000-0000-4000-8000-000000000002'
);

insert into public.farm_organizations (
  farm_id, organization_id, relationship_type, review_status
)
select
  '59000000-0000-4000-8000-000000000001',
  '39000000-0000-4000-8000-000000000001',
  'owner',
  'confirmed'
where not exists (
  select 1
  from public.farm_organizations
  where farm_id = '59000000-0000-4000-8000-000000000001'
    and organization_id = '39000000-0000-4000-8000-000000000001'
);

insert into public.farm_people (
  farm_id, person_id, relationship_type, review_status
)
select
  '59000000-0000-4000-8000-000000000002',
  '49000000-0000-4000-8000-000000000001',
  'owner',
  'confirmed'
where not exists (
  select 1
  from public.farm_people
  where farm_id = '59000000-0000-4000-8000-000000000002'
    and person_id = '49000000-0000-4000-8000-000000000001'
);

insert into public.clients (
  id, code, name, classification_kind
)
select
  '19000000-0000-4000-8000-000000000001',
  'SMOKE-EXISTING',
  'Local Existing Client',
  'unclassified'
where not exists (
  select 1 from public.clients
  where id = '19000000-0000-4000-8000-000000000001'
);