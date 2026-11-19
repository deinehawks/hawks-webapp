update public.profiles as profile
set role = 'platform_admin'
from auth.users as auth_user
where profile.id = auth_user.id
  and auth_user.email = 'local-admin@example.test';