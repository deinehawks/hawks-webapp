-- Apply only after scripts/migrate-detected-objects.js --apply verifies every
-- UUID-path copy and the compatible application has been deployed.

update storage.buckets
set public = false
where id = 'detected-objects';

drop policy if exists "tenant users can read detected objects"
  on storage.objects;

create policy "tenant users can read detected objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'detected-objects'
  and (
    app_private.is_platform_admin()
    or (storage.foldername(name))[1]
      = app_private.current_organization_id()::text
  )
);

revoke insert, update, delete on storage.objects from authenticated;

