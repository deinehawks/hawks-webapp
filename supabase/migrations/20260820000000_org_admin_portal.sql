-- Organization-admin portal: narrow audited mutations for one active organization.

drop policy if exists "organization admins manage ordinary members" on public.organization_memberships;
drop policy if exists "organization admins create their onboarding requests" on public.organization_user_requests;
drop policy if exists "organization admins cancel their onboarding requests" on public.organization_user_requests;

create or replace function app_private.enforce_organization_protected_fields()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.role()='service_role'
    or (session_user in ('postgres','supabase_admin') and auth.uid() is null)
    or app_private.domain_is_platform_admin() then return new;
  end if;
  if new.id is distinct from old.id or new.status is distinct from old.status
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at
  then raise exception 'organization identity and lifecycle fields require platform admin'; end if;
  if (new.type_code is distinct from old.type_code or new.code is distinct from old.code)
    and app_private.org_admin_organization_id() is distinct from old.id
  then raise exception 'organization classification update denied' using errcode='42501'; end if;
  return new;
end $$;

create or replace function app_private.org_admin_organization_id()
returns uuid language plpgsql stable security definer set search_path=''
as $$
declare org_id uuid; org_count integer;
begin
  select count(*),min(m.organization_id::text)::uuid into org_count,org_id
  from public.organization_memberships m
  join public.organizations o on o.id=m.organization_id
  join public.profiles p on p.id=m.profile_id
  where m.profile_id=(select auth.uid()) and m.role='org_admin' and m.status='active'
    and o.status='active' and p.account_status='active';
  if org_count<>1 then raise exception 'an active organization administrator membership is required' using errcode='42501'; end if;
  return org_id;
end $$;

create or replace function public.org_admin_create_farm(
 farm_name text,farm_code text default null,farm_crop text default 'banana',
 farm_location_name text default null,farm_area_hectares numeric default null,farm_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id(); result uuid;
begin
 if nullif(btrim(farm_name),'') is null then raise exception 'farm name is required' using errcode='22023'; end if;
 if farm_area_hectares is not null and farm_area_hectares<0 then raise exception 'farm area cannot be negative' using errcode='22023'; end if;
 insert into public.farms(name,code,crop,location_name,area_hectares,notes,status,created_by)
 values(btrim(farm_name),nullif(btrim(farm_code),''),coalesce(nullif(btrim(farm_crop),''),'banana'),
   nullif(btrim(farm_location_name),''),farm_area_hectares,nullif(btrim(farm_notes),''),'active',(select auth.uid()))
 returning id into result;
 insert into public.farm_organizations(farm_id,organization_id,relationship_type,review_status,created_by)
 values(result,org_id,'owner','confirmed',(select auth.uid()));
 return result;
end $$;

create or replace function public.org_admin_update_farm(
 farm_id uuid,farm_name text,farm_code text default null,farm_crop text default 'banana',
 farm_location_name text default null,farm_area_hectares numeric default null,
 farm_notes text default null,farm_status text default 'active'
) returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id();
begin
 if nullif(btrim(farm_name),'') is null or farm_status not in ('active','inactive')
   or (farm_area_hectares is not null and farm_area_hectares<0)
 then raise exception 'invalid farm metadata' using errcode='22023'; end if;
 if not exists(select 1 from public.farm_organizations fo where fo.farm_id=org_admin_update_farm.farm_id
   and fo.organization_id=org_id and fo.review_status='confirmed')
 then raise exception 'confirmed organization farm not found' using errcode='42501'; end if;
 update public.farms set name=btrim(farm_name),code=nullif(btrim(farm_code),''),
   crop=coalesce(nullif(btrim(farm_crop),''),'banana'),location_name=nullif(btrim(farm_location_name),''),
   area_hectares=farm_area_hectares,notes=nullif(btrim(farm_notes),''),status=farm_status,updated_at=now()
 where id=farm_id;
 return farm_id;
end $$;

create or replace function public.org_admin_update_survey(
 survey_id text,survey_location text default null,survey_flight_date date default null,
 survey_area numeric default null,survey_area_code text default null,survey_type text default null,
 survey_category text default null,survey_status public.mission_status default 'draft'
) returns text language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id();
begin
 if survey_area is not null and survey_area<0 then raise exception 'survey area cannot be negative' using errcode='22023'; end if;
 if not exists(select 1 from public.survey_organizations so where so.survey_id=org_admin_update_survey.survey_id
   and so.organization_id=org_id and so.review_status='confirmed')
 then raise exception 'confirmed organization survey not found' using errcode='42501'; end if;
 update public.surveys set location=nullif(btrim(survey_location),''),flight_date=survey_flight_date,
   area=survey_area,area_code=nullif(btrim(survey_area_code),''),type=nullif(btrim(survey_type),''),
   category=nullif(btrim(survey_category),''),status=survey_status where id=survey_id;
 return survey_id;
end $$;

create or replace function public.org_admin_update_output(
 output_id uuid,output_title text default null,output_description text default null,output_type text default 'other'
) returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id();
begin
 if output_type not in ('orthomosaic','point_cloud','object_detection','other')
 then raise exception 'unsupported output type' using errcode='22023'; end if;
 if not exists(select 1 from public.survey_outputs o join public.survey_organizations so on so.survey_id=o.survey_id
   where o.id=output_id and so.organization_id=org_id and so.review_status='confirmed')
 then raise exception 'confirmed organization output not found' using errcode='42501'; end if;
 update public.survey_outputs set title=nullif(btrim(output_title),''),
   description=nullif(btrim(output_description),''),output_type=org_admin_update_output.output_type,updated_at=now()
 where id=output_id;
 return output_id;
end $$;

create or replace function public.org_admin_create_farm_grant(
 target_profile_id uuid,target_farm_id uuid,grant_reason text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id(); result uuid;
begin
 if not exists(select 1 from public.organization_memberships m where m.organization_id=org_id
   and m.profile_id=target_profile_id and m.role='member' and m.status='active')
 then raise exception 'active ordinary member not found' using errcode='42501'; end if;
 if not exists(select 1 from public.farm_organizations fo where fo.organization_id=org_id
   and fo.farm_id=target_farm_id and fo.review_status='confirmed')
 then raise exception 'confirmed organization farm not found' using errcode='42501'; end if;
 if exists(select 1 from public.farm_access_grants g where g.organization_id=org_id
   and g.profile_id=target_profile_id and g.farm_id=target_farm_id and g.status='active')
 then raise exception 'active farm grant already exists' using errcode='23505'; end if;
 insert into public.farm_access_grants(profile_id,farm_id,organization_id,status,reason,granted_by)
 values(target_profile_id,target_farm_id,org_id,'active',nullif(btrim(grant_reason),''),(select auth.uid()))
 returning id into result;
 return result;
end $$;

create or replace function public.org_admin_set_farm_grant_status(
 grant_id uuid,next_status public.access_grant_status,grant_reason text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id(); target public.farm_access_grants%rowtype;
begin
 if next_status not in ('active','revoked') then raise exception 'invalid grant status' using errcode='22023'; end if;
 select * into target from public.farm_access_grants where id=grant_id for update;
 if target.id is null or target.organization_id is distinct from org_id
 then raise exception 'organization farm grant not found' using errcode='42501'; end if;
 if next_status='active' and (not exists(select 1 from public.organization_memberships m where m.organization_id=org_id
   and m.profile_id=target.profile_id and m.role='member' and m.status='active')
   or not exists(select 1 from public.farm_organizations fo where fo.organization_id=org_id
   and fo.farm_id=target.farm_id and fo.review_status='confirmed'))
 then raise exception 'farm grant cannot be reactivated' using errcode='42501'; end if;
 update public.farm_access_grants set status=next_status,reason=coalesce(nullif(btrim(grant_reason),''),reason),
   revoked_by=case when next_status='revoked' then (select auth.uid()) else null end,updated_at=now() where id=grant_id;
 return grant_id;
end $$;

create or replace function public.org_admin_create_survey_grant(
 target_profile_id uuid,target_survey_id text,grant_reason text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id(); result uuid;
begin
 if not exists(select 1 from public.organization_memberships m where m.organization_id=org_id
   and m.profile_id=target_profile_id and m.role='member' and m.status='active')
 then raise exception 'active ordinary member not found' using errcode='42501'; end if;
 if not exists(select 1 from public.survey_organizations so where so.organization_id=org_id
   and so.survey_id=target_survey_id and so.review_status='confirmed')
 then raise exception 'confirmed organization survey not found' using errcode='42501'; end if;
 if exists(select 1 from public.survey_access_grants g where g.organization_id=org_id
   and g.profile_id=target_profile_id and g.survey_id=target_survey_id and g.status='active')
 then raise exception 'active survey grant already exists' using errcode='23505'; end if;
 insert into public.survey_access_grants(profile_id,survey_id,organization_id,status,reason,granted_by)
 values(target_profile_id,target_survey_id,org_id,'active',nullif(btrim(grant_reason),''),(select auth.uid()))
 returning id into result;
 return result;
end $$;

create or replace function public.org_admin_set_survey_grant_status(
 grant_id uuid,next_status public.access_grant_status,grant_reason text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id(); target public.survey_access_grants%rowtype;
begin
 if next_status not in ('active','revoked') then raise exception 'invalid grant status' using errcode='22023'; end if;
 select * into target from public.survey_access_grants where id=grant_id for update;
 if target.id is null or target.organization_id is distinct from org_id
 then raise exception 'organization survey grant not found' using errcode='42501'; end if;
 if next_status='active' and (not exists(select 1 from public.organization_memberships m where m.organization_id=org_id
   and m.profile_id=target.profile_id and m.role='member' and m.status='active')
   or not exists(select 1 from public.survey_organizations so where so.organization_id=org_id
   and so.survey_id=target.survey_id and so.review_status='confirmed'))
 then raise exception 'survey grant cannot be reactivated' using errcode='42501'; end if;
 update public.survey_access_grants set status=next_status,reason=coalesce(nullif(btrim(grant_reason),''),reason),
   revoked_by=case when next_status='revoked' then (select auth.uid()) else null end,updated_at=now() where id=grant_id;
 return grant_id;
end $$;
revoke all on function app_private.org_admin_organization_id() from public,anon,authenticated;

create or replace function public.org_admin_update_organization(
 target_organization_id uuid,organization_name text,organization_code text,organization_type_code text,
 organization_email text default null,organization_mobile text default null,organization_telephone text default null,
 organization_street text default null,organization_village text default null,organization_barangay text default null,
 organization_city text default null,organization_province text default null,organization_region text default null,
 organization_country text default null,organization_zip_code text default null,organization_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id();
begin
 if target_organization_id is distinct from org_id then raise exception 'cross-organization update denied' using errcode='42501'; end if;
 if nullif(btrim(organization_name),'') is null or nullif(btrim(organization_code),'') is null or nullif(btrim(organization_type_code),'') is null
 then raise exception 'organization name, code, and type are required' using errcode='22023'; end if;
 update public.organizations set name=btrim(organization_name),code=lower(btrim(organization_code)),type_code=btrim(organization_type_code),
 email=nullif(lower(btrim(organization_email)),''),mobile=nullif(btrim(organization_mobile),''),telephone=nullif(btrim(organization_telephone),''),
 street=nullif(btrim(organization_street),''),village=nullif(btrim(organization_village),''),barangay=nullif(btrim(organization_barangay),''),
 city=nullif(btrim(organization_city),''),province=nullif(btrim(organization_province),''),region=nullif(btrim(organization_region),''),
 country=nullif(btrim(organization_country),''),zip_code=nullif(btrim(organization_zip_code),''),notes=nullif(btrim(organization_notes),''),
 updated_at=now() where id=org_id;
 return org_id;
end $$;

create or replace function public.org_admin_create_user_request(email text,name text default null,request_notes text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id(); result uuid;
begin
 if lower(btrim(email)) !~ '^[^@[:space:]]+@[^@[:space:]]+$' then raise exception 'a valid email is required' using errcode='22023'; end if;
 if exists(select 1 from public.organization_user_requests r where r.organization_id=org_id and r.requested_email=lower(btrim(email)) and r.status='pending')
 then raise exception 'a pending request already exists for this email' using errcode='23505'; end if;
 insert into public.organization_user_requests(organization_id,requested_email,requested_name,notes,status,requested_by)
 values(org_id,lower(btrim(email)),nullif(btrim(name),''),nullif(btrim(request_notes),''),'pending',(select auth.uid())) returning id into result;
 return result;
end $$;

create or replace function public.org_admin_cancel_user_request(request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id();
begin
 update public.organization_user_requests set status='cancelled',updated_at=now()
 where id=request_id and organization_id=org_id and requested_by=(select auth.uid()) and status='pending';
 if not found then raise exception 'pending onboarding request not found or cannot be cancelled' using errcode='42501'; end if;
 return request_id;
end $$;

create or replace function public.org_admin_update_member_status(
 membership_id uuid,next_status public.membership_status,membership_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id(); target public.organization_memberships%rowtype;
begin
 select * into target from public.organization_memberships where id=membership_id for update;
 if target.id is null or target.organization_id is distinct from org_id or target.role is distinct from 'member'
   or target.profile_id=(select auth.uid()) then raise exception 'ordinary membership update denied' using errcode='42501'; end if;
 if not ((target.status='active' and next_status in ('suspended','removed')) or
   (target.status='suspended' and next_status in ('active','removed')))
 then raise exception 'invalid membership status transition' using errcode='22023'; end if;
 update public.organization_memberships set status=next_status,notes=nullif(btrim(membership_notes),''),
 approved_at=case when next_status='active' then coalesce(approved_at,now()) else approved_at end,
 approved_by=case when next_status='active' then (select auth.uid()) else approved_by end,
 removed_at=case when next_status='removed' then now() else null end,updated_at=now() where id=membership_id;
 return membership_id;
end $$;

create or replace function public.org_admin_promote_member(membership_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare org_id uuid:=app_private.org_admin_organization_id();
begin
 update public.organization_memberships set role='org_admin',approved_by=(select auth.uid()),approved_at=coalesce(approved_at,now()),updated_at=now()
 where id=membership_id and organization_id=org_id and profile_id<>(select auth.uid()) and role='member' and status='active';
 if not found then raise exception 'only an active ordinary member may be promoted' using errcode='42501'; end if;
 return membership_id;
end $$;

create policy "organization admins read organization farm grants"
on public.farm_access_grants for select to authenticated
using (
  organization_id is not null
  and app_private.domain_can_admin_organization(organization_id)
);

create policy "organization admins read organization survey grants"
on public.survey_access_grants for select to authenticated
using (
  organization_id is not null
  and app_private.domain_can_admin_organization(organization_id)
);

drop trigger if exists audit_surveys on public.surveys;
create trigger audit_surveys
after insert or update or delete on public.surveys
for each row execute function app_private.domain_audit_row();

drop trigger if exists audit_farm_organizations on public.farm_organizations;
create trigger audit_farm_organizations
after insert or update or delete on public.farm_organizations
for each row execute function app_private.domain_audit_row();

revoke all on function public.org_admin_update_organization(
 uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text
) from public,anon;
revoke all on function public.org_admin_create_user_request(text,text,text) from public,anon;
revoke all on function public.org_admin_cancel_user_request(uuid) from public,anon;
revoke all on function public.org_admin_update_member_status(uuid,public.membership_status,text) from public,anon;
revoke all on function public.org_admin_promote_member(uuid) from public,anon;
revoke all on function public.org_admin_create_farm(text,text,text,text,numeric,text) from public,anon;
revoke all on function public.org_admin_update_farm(uuid,text,text,text,text,numeric,text,text) from public,anon;
revoke all on function public.org_admin_update_survey(text,text,date,numeric,text,text,text,public.mission_status) from public,anon;
revoke all on function public.org_admin_update_output(uuid,text,text,text) from public,anon;
revoke all on function public.org_admin_create_farm_grant(uuid,uuid,text) from public,anon;
revoke all on function public.org_admin_set_farm_grant_status(uuid,public.access_grant_status,text) from public,anon;
revoke all on function public.org_admin_create_survey_grant(uuid,text,text) from public,anon;
revoke all on function public.org_admin_set_survey_grant_status(uuid,public.access_grant_status,text) from public,anon;

grant execute on function public.org_admin_update_organization(
 uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text
) to authenticated;
grant execute on function public.org_admin_create_user_request(text,text,text) to authenticated;
grant execute on function public.org_admin_cancel_user_request(uuid) to authenticated;
grant execute on function public.org_admin_update_member_status(uuid,public.membership_status,text) to authenticated;
grant execute on function public.org_admin_promote_member(uuid) to authenticated;
grant execute on function public.org_admin_create_farm(text,text,text,text,numeric,text) to authenticated;
grant execute on function public.org_admin_update_farm(uuid,text,text,text,text,numeric,text,text) to authenticated;
grant execute on function public.org_admin_update_survey(text,text,date,numeric,text,text,text,public.mission_status) to authenticated;
grant execute on function public.org_admin_update_output(uuid,text,text,text) to authenticated;
grant execute on function public.org_admin_create_farm_grant(uuid,uuid,text) to authenticated;
grant execute on function public.org_admin_set_farm_grant_status(uuid,public.access_grant_status,text) to authenticated;
grant execute on function public.org_admin_create_survey_grant(uuid,text,text) to authenticated;
grant execute on function public.org_admin_set_survey_grant_status(uuid,public.access_grant_status,text) to authenticated;
