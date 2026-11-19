begin;
create extension if not exists pgtap with schema extensions;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('23000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','queue-platform@example.test','',now(),now(),now()),
('23000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','queue-org-admin@example.test','',now(),now(),now());

update public.profiles set role='platform_admin'
where id='23000000-0000-0000-0000-000000000001';

insert into public.organizations(id,type_code,code,name,status) values
('33000000-0000-0000-0000-000000000001','cooperative','QUEUE-A','Queue Org A','active');
insert into public.organization_memberships(id,profile_id,organization_id,role,status) values
('43000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000001','org_admin','active');
insert into public.organization_user_requests(
  id,organization_id,requested_email,requested_name,status,requested_by
) values
('53000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001','approved-person@example.test','Approved Person','pending','23000000-0000-0000-0000-000000000002'),
('53000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000001','rejected-person@example.test','Rejected Person','pending','23000000-0000-0000-0000-000000000002'),
('53000000-0000-0000-0000-000000000003','33000000-0000-0000-0000-000000000001','denied-person@example.test','Denied Person','pending','23000000-0000-0000-0000-000000000002');

select extensions.plan(11);
select extensions.has_column('public','organization_user_requests','review_notes','review notes column exists');
select extensions.has_function('public','admin_approve_organization_user_request',array['uuid','text'],'approve RPC exists');
select extensions.has_function('public','admin_reject_organization_user_request',array['uuid','text'],'reject RPC exists');

set local role authenticated;
set local request.jwt.claims='{"sub":"23000000-0000-0000-0000-000000000001","role":"authenticated"}';

select extensions.lives_ok(
  $$select public.admin_approve_organization_user_request('53000000-0000-0000-0000-000000000001','Approved for signup')$$,
  'platform admin approves a pending request'
);
select extensions.is(
  (select status from public.organization_user_requests where id='53000000-0000-0000-0000-000000000001'),
  'approved','approval status is recorded'
);
select extensions.ok(
  (select reviewed_by='23000000-0000-0000-0000-000000000001' and reviewed_at is not null and review_notes='Approved for signup'
   from public.organization_user_requests where id='53000000-0000-0000-0000-000000000001'),
  'approval audit fields are recorded'
);
select extensions.throws_ok(
  $$select public.admin_approve_organization_user_request('53000000-0000-0000-0000-000000000001',null)$$,
  'only pending onboarding requests can be approved',
  'review cannot be repeated'
);
select extensions.lives_ok(
  $$select public.admin_reject_organization_user_request('53000000-0000-0000-0000-000000000002','Not approved')$$,
  'platform admin rejects a pending request'
);
select extensions.is(
  (select status from public.organization_user_requests where id='53000000-0000-0000-0000-000000000002'),
  'rejected','rejection status is recorded'
);
select extensions.is(
  (select count(*) from public.profiles where email in ('approved-person@example.test','rejected-person@example.test')),
  0::bigint,'review creates no account or membership'
);

set local request.jwt.claims='{"sub":"23000000-0000-0000-0000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.admin_approve_organization_user_request('53000000-0000-0000-0000-000000000003',null)$$,
  '42501',null,'organization admin cannot review requests'
);

select * from extensions.finish();
rollback;
