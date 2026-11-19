# Protected Asset Rollback Runbook

Last updated: 2026-08-10

Status: executable rollback checklist for the workshop protected-asset path. Use this only after confirming the target environment, current active manifest, affected prefixes, and recovery owner.

## Scope

This runbook covers rollback for the protected asset delivery slice:

- Next.js app image or dev deployment;
- external NGINX protected asset routing;
- MinIO tile/point-cloud prefixes;
- Supabase workshop manifest activation/supersession;
- Cloudflare protected-path cache and routing rules.

Do not delete production or workshop data as a first rollback step. Prefer traffic/config rollback, manifest supersession, and restoration from verified source prefixes.

## Pre-Rollback Triage

1. Record the incident trigger: authorization leakage, all-authenticated `401`, MinIO `404`/`502`, map outage, bad manifest, Cloudflare cache leak, or performance failure.
2. Freeze new asset migration and manifest edits.
3. Capture current values without printing secrets:
   - active manifest key;
   - affected survey/client/organization IDs;
   - NGINX config version or file checksum;
   - app commit/image tag;
   - MinIO bucket alias and prefix;
   - Cloudflare rule IDs/names.
4. Confirm whether anonymous access is denied for `/asimov-hawks/tiles/*` and `/asimov-hawks/3d/*`. If anonymous access returns `200`, treat as security incident and prioritize NGINX/Cloudflare cache bypass rollback.

## App Rollback

1. Restore the last known-good app image, branch, or dev-server command.
2. Preserve required env values for the selected manifest, including storage alias roots such as `PROTECTED_ASSET_STORAGE_TILES_ROOT=tiles`.
3. Restart the app service or Next dev process.
4. Verify:
   - `/asimov-hawks` responds through NGINX;
   - `/asimov-hawks/internal/asset-auth` returns `401` without valid cookies and no redirect;
   - app logs do not expose secrets or raw service-role values.

## NGINX Rollback

1. Revert only the protected asset route/auth_request config to the last known-good version.
2. Keep protected paths fail-closed during rollback. If MinIO routing is uncertain, return `401`/`503`; do not bypass auth to public assets.
3. Reload NGINX and verify config syntax before switching traffic.
4. Re-test:
   - anonymous tile and point-cloud requests return `401`;
   - authenticated approved tile requests return `200` when the app and manifest are healthy;
   - denied or unknown routes do not proxy to MinIO.

## MinIO Prefix Rollback

1. Do not delete migrated prefixes until app and manifest rollback are verified.
2. If a copied prefix is bad, stop new writes and mark the affected prefix/version in the incident notes.
3. Restore from the original source folder or known-good backup into a new reviewed prefix when possible.
4. Verify object count, byte total, and sample tiles before pointing any active manifest at the replacement prefix.
5. Keep temporary buckets private and remove them only after the real bucket copy and manifest path are verified.

## Supabase Manifest Rollback

1. Do not mutate approved manifest entries directly.
2. Use the supersession workflow to activate a replacement manifest that points back to the last known-good bucket alias/prefix or excludes the failing asset entry.
3. Confirm the replacement manifest is active and approved for the intended dataset year.
4. Run DB-side authorization simulation for platform admin and at least one intended organization member.
5. Verify anonymous requests still deny through NGINX before testing authenticated `200` responses.

## Cloudflare Rollback

1. Ensure `/asimov-hawks/tiles/*` and `/asimov-hawks/3d/*` bypass edge caching for v1.
2. If a bad rule may have cached protected assets, purge affected paths or disable the rule before restoring traffic.
3. Confirm Cloudflare does not expose MinIO hostnames, buckets, credentials, or cacheable protected responses.
4. Re-test from an external network before declaring rollback complete.

## Completion Criteria

Rollback is complete only when:

- anonymous protected asset requests return `401`;
- permitted users can access the restored approved sample assets;
- denied cross-organization and unknown routes fail closed;
- active manifest and MinIO prefix are documented;
- app, NGINX, Supabase, MinIO, and Cloudflare owners agree no recovery step remains.
