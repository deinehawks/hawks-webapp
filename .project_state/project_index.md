# Project Index

Last updated: 2026-08-12

Use this index after the compressed `.project_state` files when a task needs deeper context. Retrieve only the sections that matter to the current task.

## Core Delivery And Roadmap

- `docs/admin-dashboard-integration-plan.md`: master phased plan, workshop scope, architecture, and delivery timeline.
- `docs/admin-mvp-operator-guide.md`: concise operator guide for the current mostly-read-only Admin MVP and enabled platform-admin workflows.
- `docs/infrastructure-status.md`: current infra posture, staging/prod notes, and unresolved deployment gaps.

## Workshop Manifest And Protected Assets

- `docs/workshop-manifest-gate-decisions.md`: approved v1 manifest decisions and scope boundaries.
- `docs/workshop-manifest-schema-design.md`: manifest table, RLS, audit, and immutability contract.
- `docs/workshop-manifest-gate-amendment-tiles.md`: tile-path-oriented manifest amendment guidance.
- `docs/protected-asset-delivery-design.md`: protected tile/point-cloud design and route contract.
- `docs/protected-asset-implementation-plan.md`: implementation slice plan for app auth, alias resolution, and NGINX handoff.
- `docs/protected-asset-delivery-review-fixes.md`: review-driven corrections to active-manifest and auth behavior.
- `docs/protected-asset-nginx-handoff-checklist.md`: external NGINX/MinIO/Cloudflare contract and smoke-test checklist.
- `docs/protected-asset-pilot-validation-log.md`: detailed MinIO/staging pilot chronology and validation notes for `AH-026005`.
- `docs/protected-asset-rollback-runbook.md`: executable rollback checklist for app, NGINX, MinIO, Supabase manifest, and Cloudflare.
- `docs/validation-baseline-2026-08-10.md`: recorded workshop smoke baseline after protected tile and point-cloud validation.
- `docs/workshop-asset-migration-wave-plan.md`: controlled MinIO migration-wave plan for expanding from the `AH-026005` protected-asset pilot.
- `docs/workshop-wave1-staging-prep-2026-08-10.md`: exact Wave 1 prep for finishing `AH-026005` and staging `barbco2026/AH-0260001`, including local counts, prefixes, and SQL scaffold.

## Database Migration And Verification

- `docs/supabase-migration-runbook.md`: phased DB migration/rollback guidance and verification queries.
- `supabase/migrations/`: checked-in additive schema/RLS/RPC migrations.
- `supabase/tests/`: pgTAP coverage for manifest gate and protected asset authorization.
- `supabase/verification/`: SQL verification scripts for manifest and protected-asset contract checks.

## Lint, TypeScript, And Build Baselines

- `eslint.config.mjs`: current flat-config lint baseline.
- `docs/validation-baseline-2026-08-10.md`: workshop smoke status plus current lint/type/build baseline notes.

## Source Hotspots

- `lib/actions/surveys.ts`: survey detail fetch and current ortho/point-cloud joins.
- `components/maps/ortho-map.tsx`: protected orthomap URL building and tile-folder fallback.
- `components/maps/survey-map.tsx`: survey map tile-folder usage.
- `lib/assets/minio-aliases.ts`: alias-to-private-prefix resolver for protected asset delivery.
- `app/asimov-hawks/internal/asset-auth/route.ts`: protected asset auth endpoint for NGINX `auth_request`.
- `scripts/stage-ah-026005-z24-batch.ps1`: manual-staging helper for safe `AH-026005` zoom-24 tile batches.
- `scripts/publish-protected-assets.js`: config-driven protected asset publisher with `.tmp` report/state output.
- `scripts/minio-publish-jobs.example.json`: example publisher config for current `barbco2026` migration jobs and manifest/tile-folder report output.
