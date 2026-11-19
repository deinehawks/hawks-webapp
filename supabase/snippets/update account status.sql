update public.profiles as profile
set
  role = 'platform_admin',
  account_status = 'active',
  updated_at = now()
from auth.users as auth_user
where profile.id = auth_user.id
  and auth_user.email = 'local-admin@example.test'
returning profile.id, profile.role, profile.account_status;