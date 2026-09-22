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
    app_private.domain_is_platform_admin()
    or (
      (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and app_private.domain_has_client_access(
        ((storage.foldername(name))[1])::uuid
      )
    )
  )
);

revoke insert, update, delete on storage.objects from authenticated;
