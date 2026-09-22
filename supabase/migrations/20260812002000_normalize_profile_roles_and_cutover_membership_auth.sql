-- Expand the account-level role enum to include `user`. Follow-up defaults,
-- data normalization, and authorization cutover happen in the next migration
-- after this enum change commits.

alter type public.app_role add value if not exists 'user';