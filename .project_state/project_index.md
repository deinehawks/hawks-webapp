# Project Index

Last updated: 2026-08-25

Use this index after the compressed startup files. Document classifications prevent historical plans from being mistaken for current instructions.

## Authoritative And Current

- `docs/admin-dashboard-integration-plan.md`: primary admin architecture, route split, delivery order, mutation boundaries, and deferred scope.
- `docs/role-permission-model-and-migration-plan.md`: current account/membership/grant authority model and completed legacy-column migration history.
- `docs/supabase-migration-runbook.md`: current database rollout, verification, recovery, and post-removal invariants.
- `docs/admin-mvp-operator-guide.md`: current platform-admin operations for memberships, grants, and user-first signup review.
- `docs/survey-identity-client-contract.md`: current immutable survey identity,
  retained client compatibility, editable metadata, and first-stage mutation
  contract.
- `docs/survey-contract-staging-validation-2026-08-25.md`: checksummed backup,
  isolated restore, migration/containment, staging apply, and verification
  evidence for the first survey contract stage.
- `.project_state/decisions.md`: concise approved decisions and explicit supersessions.

## Supporting Current References

- `docs/admin-mvp-operator-guide.md`: transitional operator guide for the currently implemented `/dashboard/admin` workflows until `/admin` cutover.
- `docs/infrastructure-status.md`: infrastructure posture, staging/production notes, and unresolved deployment gaps.
- `docs/workshop-manifest-gate-decisions.md`: approved workshop manifest scope and decisions.
- `docs/workshop-manifest-schema-design.md`: manifest tables, RLS, audit, and immutability contract.
- `docs/workshop-manifest-gate-amendment-tiles.md`: authoritative tile-path manifest amendment.
- `docs/protected-asset-delivery-design.md`: protected tile/point-cloud route and authorization design.
- `docs/protected-asset-implementation-plan.md`: implemented app auth, alias resolution, and NGINX handoff plan; read its status notice before using historical steps.
- `docs/protected-asset-delivery-review-fixes.md`: review-driven active-manifest and authorization corrections.
- `docs/protected-asset-nginx-handoff-checklist.md`: external NGINX/MinIO/Cloudflare contract and smoke checklist.
- `docs/protected-asset-rollback-runbook.md`: rollback procedure for app, NGINX, MinIO, Supabase manifest, and Cloudflare.
- `docs/workshop-asset-migration-wave-plan.md`: controlled workshop asset-wave plan.
- `docs/workshop-wave1-staging-prep-2026-08-10.md`: Wave 1 staging preparation evidence.
- `docs/validation-baseline-2026-08-10.md`: recorded workshop and validation baseline.
- .project_state/protected_asset_delivery_state.md: compressed current protected-asset authorization state.
- .project_state/manifest_gate_state.md: compressed current manifest-gate state.
- `docs/pre-implementation-review-resolutions.md` and `docs/pre-implementation-review-resolution-addendum.md`: supporting protected-asset/manifest decisions; role references defer to the current role-model document.

## Historical Or Superseded Evidence

- `docs/admin-dashboard-phase-2-discovery.md`: read-only July 2026 repository/intern-dashboard snapshot; not a current plan.
- Historical Phase 3A-3I sections inside `docs/admin-dashboard-integration-plan.md`: preserved implementation history, superseded where Sections 1-3 conflict.
- Pre-removal dependency inventories and drop gates inside `docs/role-permission-model-and-migration-plan.md`: completed migration evidence only.
- `.project_state/preimplementation_resolution_state.md` and `.project_state/preimplementation_final_decisions_state.md`: compressed snapshots of completed protected-asset planning decisions.

## Database And Verification

- `supabase/migrations/`: checked-in migration history and current schema contract.
- `supabase/tests/`: pgTAP authorization coverage.
- `supabase/migrations/20260820000000_org_admin_portal.sql`, corrective
  migration `20260824000000_restrict_org_admin_survey_output.sql`, and
  `supabase/tests/org_admin_portal.sql`: staged org-admin RPC contract and
  focused authorization coverage.
- `supabase/verification/inventory_org_admin_portal.sql` and
  `supabase/rollback/20260820000000_org_admin_portal.sql`: org-admin rollout
  inventory and guarded non-destructive containment procedure.
- `supabase/migrations/20260824001000_admin_onboarding_request_review.sql`,
  `supabase/tests/admin_onboarding_requests.sql`, and matching verification and
  rollback files: staged and authenticated-smoke-validated platform-admin
  onboarding review queue contract.
- `supabase/verification/`: current verification SQL.
- `supabase/verification/inventory_access_policy_v2.sql`: pre-rollout affected-data and policy inventory.
- `supabase/rollback/20260818000000_access_policy_v2.sql`: guarded non-destructive containment rollback; full reversal uses the tested backup.

## Source Hotspots

- `lib/auth/user-context.ts`: authenticated profile and access context.
- `lib/org-admin/context.ts`, `lib/actions/org-admin.ts`, and
  `app/org-admin/`: strict organization-admin context, narrow RPC application
  actions, and portal routes.
- `app/admin/onboarding-requests/` and
  `lib/actions/admin-onboarding-requests.ts`: platform-admin onboarding review
  queue and RPC-only review actions.
- `lib/actions/surveys.ts`: survey authorization and current output joins.
- `app/dashboard/admin/`: transitional admin implementation.
- `app/asimov-hawks/internal/asset-auth/route.ts`: protected asset authorization endpoint.
- `lib/assets/minio-aliases.ts`: private asset alias resolver.
- `scripts/publish-protected-assets.js`: legacy manifest-driven publisher/report flow.
- `docs/workshop-asset-batch-runbook.md`: current private-allowlist,
  preparation, review, background upload, verification, and manifest handoff.
- `scripts/prepare-workshop-assets.js` and
  `scripts/publish-workshop-assets.js`: current workshop batch preparation and
  streaming staging publisher.

## Validation Baselines

- `eslint.config.mjs`: current lint configuration.
- `docs/validation-baseline-2026-08-10.md`: known lint/type/build and workshop smoke notes.
