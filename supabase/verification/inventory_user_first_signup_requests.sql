-- Read-only inventory. Save output outside Git if it contains operational data.

select status, count(*) as total
from public.account_signup_approvals
group by status
order by status;

select count(*) as profiles_without_auth_user
from public.profiles as profile
left join auth.users as auth_user on auth_user.id = profile.id
where auth_user.id is null;

select count(*) as auth_users_without_profile
from auth.users as auth_user
left join public.profiles as profile on profile.id = auth_user.id
where profile.id is null;
