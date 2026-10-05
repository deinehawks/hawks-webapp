# Dynamic survey publishing

Status: implemented; fresh staging backup, isolated rehearsal and explicitly
approved staging migration completed on 2026-10-05. Direct post-apply schema,
permissions, preservation and migration-history verification pass. See
[rehearsal evidence](dynamic-survey-publishing-staging-rehearsal-2026-10-05.md).
Production is unchanged. The user confirmed all ten existing-asset/access
browser smoke checks passed; publication lifecycle smoke remains pending.

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
- Platform-admin RPCs explicitly revoke service-role execution, including
  grants inherited from Supabase default ACLs.
- Organization admins and ordinary members cannot mutate publication records.
- Consumer reads inherit `app_private.domain_can_read_survey(survey_id)` and
  enforce the derived organization/private/platform-admin protection level.
- Anonymous, inactive, and cross-scope access remains denied. Operational
  publication rows are not directly readable by members.
- The protected asset-authorizer resolves dynamic publications first and keeps
  the active workshop manifest only as a compatibility fallback.

## Local validation

- Clean local schema replay: passed.
- Revised focused publication pgTAP: 38/38 passed in the staging restore clone.
- Earlier full clean-local pgTAP: 242/242 passed before four new assertions.
- Current full staging-schema suite: 245/246; the one pre-existing anonymous
  organization SELECT-grant mismatch is documented in the rehearsal evidence.
- V3 TypeScript and targeted ESLint: passed.
- V2 recording/authorization tests: 30/30 passed.
- V2 repository-wide TypeScript still reports only its documented legacy UI
  errors; no diagnostic points to the dynamic loader or asset-auth files.

## Rollout gate

The staging schema gate is complete: exact-hash approval, apply and read-only
verification passed. The discovery RPC is live; existing records and the active
manifest remain unchanged. The user passed V3 controls, ordinary-member V2
discovery, cross-scope denial, tiles, point clouds and legacy compatibility. Publication
lifecycle smoke requires separately scoped test records/actions; this approval
did not publish or retire outputs. Production requires separate approval.

V3's existing output detail page remains usable when deployed before the
migration: it shows a pending-migration message in place of the new publishing
controls. Only a missing publication table is treated this way; other database
errors still fail closed.
