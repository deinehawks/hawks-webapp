begin;
create extension if not exists pgtap with schema extensions;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('22000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','oa-admin@example.test','',now(),now(),now()),
('22000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','oa-member@example.test','',now(),now(),now()),
('22000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','oa-other@example.test','',now(),now(),now());

insert into public.organizations(id,type_code,code,name,status) values
('32000000-0000-0000-0000-000000000001','cooperative','OA-A','Org Admin A','active'),
('32000000-0000-0000-0000-000000000002','association','OA-B','Org Admin B','active');
insert into public.organization_memberships(id,profile_id,organization_id,role,status) values
('42000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','org_admin','active'),
('42000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002','32000000-0000-0000-0000-000000000001','member','active'),
('42000000-0000-0000-0000-000000000003','22000000-0000-0000-0000-000000000003','32000000-0000-0000-0000-000000000002','member','active');
insert into public.farms(id,name,status) values
('52000000-0000-0000-0000-000000000001','OA Farm A','active'),
('52000000-0000-0000-0000-000000000002','OA Farm B','active');
insert into public.farm_organizations(farm_id,organization_id,relationship_type,review_status) values
('52000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','owner','confirmed'),
('52000000-0000-0000-0000-000000000002','32000000-0000-0000-0000-000000000002','owner','confirmed');
insert into public.surveys(id,status) values ('oa-survey-a','draft'),('oa-survey-b','draft');
insert into public.survey_organizations(survey_id,organization_id,relationship_type,review_status) values
('oa-survey-a','32000000-0000-0000-0000-000000000001','participant','confirmed'),
('oa-survey-b','32000000-0000-0000-0000-000000000002','participant','confirmed');
insert into public.survey_outputs(id,survey_id,output_type,status,is_current,storage_bucket,storage_path) values
('62000000-0000-0000-0000-000000000001','oa-survey-a','legacy_type','ready',true,'survey-assets','fixed/path');

select extensions.plan(16);
select extensions.is((select count(*) from pg_policies where schemaname='public' and policyname='organization admins manage ordinary members'),0::bigint,'broad membership policy is absent');
select extensions.is((select count(*) from pg_policies where schemaname='public' and policyname in ('organization admins create their onboarding requests','organization admins cancel their onboarding requests')),0::bigint,'direct onboarding mutation policies are absent');

set local role authenticated;
set local request.jwt.claims='{"sub":"22000000-0000-0000-0000-000000000001","role":"authenticated"}';

select extensions.lives_ok($$select public.org_admin_update_organization(
 '32000000-0000-0000-0000-000000000001','Org Admin Updated','oa-a-updated','cooperative')$$,'org admin edits own profile');
select extensions.is((select status from public.organizations where id='32000000-0000-0000-0000-000000000001'),'active','organization status remains immutable');
select extensions.throws_ok($$select public.org_admin_update_organization(
 '32000000-0000-0000-0000-000000000002','Denied','denied','association')$$,'42501',null,'cross-organization profile update is denied');
select extensions.lives_ok($$select public.org_admin_create_user_request('invite@example.test','Invitee','Workshop')$$,'org admin submits onboarding request');
select extensions.is((select count(*) from public.organization_user_requests where organization_id='32000000-0000-0000-0000-000000000001'),1::bigint,'request is scoped to actor organization');
select extensions.lives_ok($$select public.org_admin_update_member_status('42000000-0000-0000-0000-000000000002','suspended',null)$$,'ordinary member may be suspended');
select extensions.throws_ok($$select public.org_admin_update_member_status('42000000-0000-0000-0000-000000000001','suspended',null)$$,'42501',null,'org admins cannot alter org-admin memberships');
select extensions.lives_ok($$select public.org_admin_update_member_status('42000000-0000-0000-0000-000000000002','active',null)$$,'ordinary member may be reactivated');
select extensions.lives_ok($$select public.org_admin_create_farm_grant('22000000-0000-0000-0000-000000000002','52000000-0000-0000-0000-000000000001','scope')$$,'own-organization farm grant succeeds');
select extensions.throws_ok($$select public.org_admin_create_farm_grant('22000000-0000-0000-0000-000000000003','52000000-0000-0000-0000-000000000001',null)$$,'42501',null,'cross-organization member grant is denied');
select extensions.lives_ok($$select public.org_admin_create_survey_grant('22000000-0000-0000-0000-000000000002','oa-survey-a','scope')$$,'own-organization survey grant succeeds');
select extensions.throws_ok($$select public.org_admin_create_survey_grant('22000000-0000-0000-0000-000000000002','oa-survey-b',null)$$,'42501',null,'cross-organization survey grant is denied');
select extensions.lives_ok($$select public.org_admin_update_output('62000000-0000-0000-0000-000000000001','Updated','Safe','other')$$,'allowed output metadata update succeeds');
select extensions.is((select storage_path||':'||status::text||':'||is_current::text from public.survey_outputs where id='62000000-0000-0000-0000-000000000001'),'fixed/path:ready:true','output operational fields remain immutable');

select * from extensions.finish();
rollback;
