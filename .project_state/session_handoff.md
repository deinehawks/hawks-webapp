# Session Handoff

Last updated: 2026-08-04

The existing domain authorization baseline is fixed. The issue was a test actor mismatch: an org-admin denial section was still impersonating the platform-admin user. `supabase/tests/domain_authorization.sql` now impersonates the org-admin for those denial assertions.

Current local DB validation is green: migration reset passed, structural verification passed, workshop manifest test passed, existing authorization test passed, corrected domain authorization test passed, full `npx supabase test db --local` passed with 59 tests, and local schema lint passed with no warnings.

Commit `aa9f81d3` records the manifest gate, protected asset design docs, migrations, verification SQL, and local DB test fixes. `workflow.txt` remains untracked and intentionally uncommitted.

Protected asset implementation planning is approved in `docs/protected-asset-implementation-plan.md`. Repo boundary is clarified: this repo owns only the Next.js app-side auth implementation; NGINX/Compose config belongs to the existing external WSL Docker infrastructure. Next recommended task: implement app-side protected asset auth first: parser/helper, `/internal/asset-auth` route, middleware no-redirect exception, active 2026 manifest lookup, organization authorization, and focused tests.

Initial Next.js protected asset auth implementation added locally: `lib/assets/protected-asset-auth.ts`, `lib/assets/minio-aliases.ts`, `app/internal/asset-auth/route.ts`, and middleware no-redirect handling for `/internal/asset-auth`. Validation: `npx tsc --noEmit` still fails on known pre-existing app baseline files, with no new protected-asset file errors. The manifest RLS caveat is addressed locally by `supabase/migrations/20260804004000_protected_asset_authorization_rpc.sql`, which exposes only a narrow authenticated RPC result through `public.authorize_workshop_protected_asset(...)` and keeps manifest table access inside `app_private.lookup_protected_asset_manifest_entry(...)`. Validation after the RPC: local DB reset passed, DB lint passed, full pgTAP suite passed. Added `supabase/tests/protected_asset_authorization.sql`; focused RPC tests pass, and the full suite now passes 4 files / 66 tests. TypeScript still only reports known pre-existing app baseline errors.