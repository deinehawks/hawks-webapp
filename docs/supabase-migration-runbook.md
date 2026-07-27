# Supabase UUID Tenant Migration Runbook

Target staging project: `llealjcaqvltrtdwwzrh`

This runbook covers the additive UUID migration. Contract cleanup and deletion
of legacy storage objects require separate approval.

## Required inputs

- A verified restorable staging backup or a database password for `pg_dump`.
- `SUPABASE_ACCESS_TOKEN` for CLI linking.
- `SUPABASE_DB_PASSWORD` for database dump and migration operations.
- `BOOTSTRAP_PLATFORM_ADMIN_USER_ID`, containing one confirmed `auth.users.id`.
- Existing application environment variables. Never print or commit values.

## Establish the baseline

1. Confirm the project URL resolves to the staging reference above.
2. Capture both backups before any remote migration:

   ```powershell
   npx supabase link --project-ref llealjcaqvltrtdwwzrh
   npx supabase db dump --linked --schema-only --file backups/staging-schema.sql
   npx supabase db dump --linked --data-only --use-copy --file backups/staging-data.sql
   ```

3. Store backups outside Git and test restoration against an isolated database.
4. Mark the reconstructed baseline as applied on staging:

   ```powershell
   npx supabase migration repair 20260727000000 --status applied --linked
   ```

5. Use `npx supabase db push --dry-run --linked` and confirm that only the two
   additive migrations are pending.

The checked-in baseline is intended for new local databases. It must not be
executed against the existing staging project.

## Rehearse locally

```powershell
npx supabase start
npx supabase db reset
npx supabase db lint --local --level warning
```

Load a sanitized staging fixture, run
`supabase/verification/verify_expand.sql`, and exercise all role scenarios.

## Apply the expand phase

```powershell
npx supabase db push --linked
npx supabase db lint --linked --level warning
npx supabase gen types typescript --linked --schema public > lib/database.types.ts
```

Run `supabase/verification/verify_expand.sql`. Expected results:

- No client, assigned profile, or survey lacks its UUID relationship.
- Only intentionally pending profiles have no organization.
- No legacy code or current-output pointer mismatches exist.
- No imported survey remains an unclassified draft.
- Authorization helpers are absent from the exposed `public` schema.

Promote the bootstrap administrator only after confirming the UUID:

```sql
update public.profiles
set role = 'platform_admin'
where id = '<confirmed auth.users.id>'::uuid;
```

Require exactly one affected row and verify the user can sign in before
continuing.

## Storage transition

1. Run `npm run migrate-detected-objects` for a dry-run report.
2. Run `npm run migrate-detected-objects:apply`.
3. Verify every source and destination SHA-256 digest matches.
4. Deploy the UUID-compatible application.
5. Apply `supabase/deferred/secure_detected_objects_storage.sql`.
6. Verify anonymous and cross-tenant downloads fail.

Do not delete legacy root objects during this phase.

## Contract phase

After the observation window:

1. Confirm the two pending profiles are assigned or intentionally promoted to
   platform administrators.
2. Move `supabase/deferred/contract_uuid_tenant_keys.sql` into migrations with
   a new timestamp.
3. Run the dry-run, backup, local rehearsal, staging apply, and verification
   sequence again.
4. Delete legacy storage objects only through a separately reviewed operation.

## Recovery

For additive-phase application failure, redeploy the previous application;
legacy columns and storage objects remain intact.

For database integrity or authorization failure, disable the affected release,
stop writes, preserve logs, and restore the tested pre-migration backup into an
isolated project before deciding whether to restore staging.

