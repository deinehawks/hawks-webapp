# Dynamic survey publishing

Status: implemented and validated locally on 2026-10-05. The migration has not
been applied to staging or production.

## Purpose

V3 is the source of truth for survey and output publication. V2 keeps its old
interface, but discovers only outputs that are both published and readable by
the signed-in account through the existing Supabase authorization model.
The ignored V2 `.recording/selection.json`, `catalog.json`, and output bindings
remain historical migration evidence; they are no longer runtime allowlists.

## Lifecycle

1. A platform administrator creates or updates a protected-delivery draft on a
   current `orthomosaic` or `point_cloud` output.
2. The database derives the client code, protection scope, object prefix, and
   browser route from canonical relationships. The year is explicit and is not
   hardcoded to 2026.
3. An approved service process verifies the uploaded objects through the narrow
   idempotent verification RPC. Direct authenticated table writes remain denied.
4. A platform administrator publishes the verified delivery. Authorized users
   can then discover it through `list_authorized_published_survey_assets()`.
5. Retirement removes the delivery from discovery and protected delivery.
   A retired dynamic record cannot silently fall back to an older active
   workshop-manifest entry for the same survey, year, and artifact type.

Point clouds are limited to 5 GiB. Published output discovery also returns the
specialized artifact identifier, so V2 must agree with the survey pointer and
current `orthos` or `point_clouds` row before rendering an asset.

## Security boundary

- Platform admins manage drafts, publishing, retirement, and draft deletion
  through audited RPCs.
- Verification is service-role-only and idempotent by source/run identifier.
- Organization admins and ordinary members cannot mutate publication records.
- Consumer reads inherit `app_private.domain_can_read_survey(survey_id)` and
  enforce the derived organization/private/platform-admin protection level.
- Anonymous, inactive, and cross-scope access remains denied. Operational
  publication rows are not directly readable by members.
- The protected asset-authorizer resolves dynamic publications first and keeps
  the active workshop manifest only as a compatibility fallback.

## Local validation

- Clean local schema replay: passed.
- Focused publication pgTAP: 34/34 passed.
- Full database pgTAP: 242/242 passed.
- V3 TypeScript and targeted ESLint: passed.
- V2 recording/authorization tests: 30/30 passed.
- V2 repository-wide TypeScript still reports only its documented legacy UI
  errors; no diagnostic points to the dynamic loader or asset-auth files.

## Rollout gate

Do not use the V2 dynamic reader against staging until the migration is
separately reviewed, backed up, rehearsed in an isolated clone, explicitly
approved, applied to non-production staging, and verified. After that apply,
smoke platform-admin draft/verify/publish/retire, ordinary-member discovery,
cross-scope denial, tiles, point clouds, and legacy-manifest compatibility.
Production requires a separate approval and rollout.

V3's existing output detail page remains usable when deployed before the
migration: it shows a pending-migration message in place of the new publishing
controls. Only a missing publication table is treated this way; other database
errors still fail closed.
