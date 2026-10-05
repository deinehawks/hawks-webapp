# Dynamic survey publishing: staging backup and rehearsal

Date: 2026-10-05. Target: non-production Supabase project
`llealjcaqvltrtdwwzrh`. Status: rehearsal and explicitly approved staging apply
complete. Direct post-apply verification passed. Production and running
infrastructure were not changed. User-assisted existing-asset/access browser
smoke passed; publication lifecycle smoke remains pending.

## Exact approval scope

Apply only `supabase/migrations/20261005000000_dynamic_survey_output_publishing.sql`.
SHA-256: `5c7b20cd121429d0f65947a2ba51056207e842090e3359f3a45aa045f489ef41`.
The linked dry-run lists only this migration. Approval is for the schema/RPC
change and its migration-history entry. It does not publish or retire an
output, change a manifest, upload an asset, or authorize production rollout.

The migration adds an initially empty publication table, audited admin RPCs,
service-only verification, authorized discovery, and dynamic-first protected
asset lookup. It preserves the active-manifest fallback and existing records.
See [the publication contract](dynamic-survey-publishing.md).

## Read-only staging inventory

The locked staging resolver ran inventory and baseline checks in read-only
transactions. Staging contains 24 Auth users, 24 profiles, 164 surveys,
4 generalized output records, and 131 total manifest entries. The approved
active manifest contains 77 entries. The publication table and all eight new
public/private RPC/helper names were absent before rehearsal.

The four generalized outputs are non-current orthomosaics: three drafts and
one archived record. Existing specialized artifacts and manifest deliveries
remain usable. Future publication requires a valid current output; the
migration does not fabricate or promote output records.

## Checksummed backup

Ignored recovery directory: `backups/staging-dynamic-publishing-20261005/`.
Exports completed between 07:19:53 and 07:26:53 UTC (15:19:53-15:26:53 Manila).
The Auth/Public/app_private dumps retain object/default ACLs and omit owner
assignments so the disposable restore can use local `supabase_admin`.
Auth managed migration-history data is excluded. These are scoped database
recovery artifacts; MinIO assets are not copied by this backup.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `staging-schema.sql` | 219006 | `271ea9d19f34e0fcf8ab196427dad455562a3af3de3a6eaf10527f9fac5ff059` |
| `staging-auth-schema.sql` | 67847 | `a2d290c5fce4afa942ad14e1cc5afaae5ca9d82b8464be1130acfee0398a13e8` |
| `staging-public-data.sql` | 1027374 | `c13d62b7f69db8854e6d21fa8d7a5fe026ae498751c625479beead52205c4003` |
| `staging-auth-data.sql` | 305770 | `714b18b7d1ebb7c9bb9b1ccb14f1498e174f165b5beba838b88ff199d0aabb97` |
| `staging-combined-schema.sql` | 286112 | `0eaf4b57075cc10a9117b67768994b5612a54976f3348a439aea8a9e6335dc65` |

The combined schema dump restores cross-schema dependencies in database
order. Host/container hashes for the restored schema and data files match.
`SHA256SUMS` is retained beside the ignored backups. No credentials or private
row contents are included in this document.

## Isolated restore and migration

All work used disposable databases in the existing local Supabase Postgres
container, without resetting its normal `postgres` database or restarting
services:

- `dynamic_publishing_rehearsal_20261005`: initial restore and permission review.
- `dynamic_publishing_rehearsal_final_20261005`: clean recovery, revised exact
  migration, rollback, baseline comparison, reapply and focused tests.
- `dynamic_publishing_clean_20261005`: staging schema plus canonical organization
  types, without private data, for the full fixture-based SQL suite.

The restore bootstraps managed schemas/extensions and the Realtime publication.
Data triggers are disabled only in the isolated restore transaction to handle
circular references. All 52 compared Auth/Public/app_private table counts
match staging, excluding only the intentionally omitted `auth.schema_migrations`.
Test roles receive the local Supabase `extensions` schema usage grant solely
for pgTAP execution.

Initial setup attempts exposed PowerShell quoting and the empty default
`public` schema; both were corrected inside the disposable clone before the
successful restore. The first role-simulated test run needed the documented
test-harness extension grant. Neither issue changed staging.

Permission review found Supabase default ACLs granted `service_role` execution
on the new platform-admin RPCs. The revised migration explicitly revokes those
four grants; four regression assertions were added. Internal admin checks are
retained. Service verification and authorized discovery keep their intended
service-role grants; private helpers are not directly executable by consumer
or service roles.

The exact revised migration, read-only contract verifier, and focused pgTAP
suite pass. Focused pgTAP: **38/38** with zero failures, including idempotency,
5 GiB limits, publication/retirement, member discovery, cross-scope denial,
operational-row privacy, and the new service-role execute denials.
After transactional tests, counts remain 164 surveys, 4 outputs, 131 total
manifest entries, 77 active entries, and zero publication rows. Platform-admin
discovery returns all 77 legacy-manifest assets across 62 distinct survey IDs;
the historical 58-survey recording selection is no longer a runtime limit.

## Rollback and compatibility evidence

`supabase/rollback/20261005000000_dynamic_survey_output_publishing.sql`
restores the exact pre-migration asset lookup captured read-only from staging,
then removes only the new empty publication surface. It requires
`app.dynamic_publishing_rollback_confirmed = 'confirmed-empty'`, locks the
publication table, and refuses recovery if any publication row exists.
Nonempty-state recovery needs separately reviewed containment/forward recovery.
Migration history must also be reconciled during any approved real rollback;
the local rehearsal does not modify staging history.

- Missing confirmation: rejected; clone unchanged.
- Confirmed recovery with a temporary publication row: rejected; fixture rolled back.
- Confirmed empty-state recovery: passed.
- Baseline recovery: all 52 table counts and all 26 application-table row
  fingerprints match staging; the old asset-lookup definition matches exactly.
- Exact revised migration reapply: passed; focused tests again pass 38/38.

A generated rollback statement initially lacked its SQL terminator; isolated
rehearsal caught it before commit. The corrected rollback completes successfully.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Migration | 38681 | `5c7b20cd121429d0f65947a2ba51056207e842090e3359f3a45aa045f489ef41` |
| Focused pgTAP | 15670 | `d494ccdc67ef9929f06b8311119b1e8862bcf8d540fe04977f81a282b42d4483` |
| Guarded rollback | 4940 | `6ee327b5ad01ad43646779efedf1d31c8f7966f9a9a9c6d81605c99440aef968` |
| Read-only verifier | 4123 | `b9041e211afb34229e2e4260c0bbbc2527055e342741752e20751c021ca1d352` |

## Existing test/permission discrepancy

The full suite in the clean staging-schema clone passes **245/246** assertions.
The one failure is the existing `domain_authorization.sql` assertion expecting
anonymous SELECT on `organizations` to raise `42501`. Staging already grants
that SELECT, while RLS exposes zero rows. Read-only staging verification confirms
zero anonymous organizations and `42501` for surveys, profiles, clients, orthos
and point clouds. This mismatch reproduces before the migration and is not
introduced by publication changes. Track explicit anonymous organization-table
grant hardening as a separate reviewed follow-up; no remote privilege was changed.

Running the full suite against populated backup data also encounters existing
absolute-count assertions and fixture-email collisions in six files. The same
failures reproduce after baseline recovery. The clean clone removes those data
collisions, leaving only the permission discrepancy above. The earlier clean
local schema replay/full suite passed 242/242 before the four new assertions;
it must not be confused with this staging-schema result.

## Approved staging apply

The user explicitly approved the exact migration/hash above, limited to staging
schema changes without publishing outputs or changing manifests. Preflight
rechecked the hash, linked target, all five backup checksums, all 52 existing
table counts and all 26 application-table fingerprints against the rehearsal
clone. No relevant data drift was found; the dry-run listed only this migration.

`npx supabase db push --linked --yes` applied exactly the approved file and
exited successfully. The CLI reported a non-blocking pg-delta catalog-cache
export warning about a missing `pgdelta-target-ca.crt`. Direct database checks
confirmed the actual schema, security contract and migration-history entry
`20261005000000` / `dynamic_survey_output_publishing`; the later linked dry-run
reports that the remote database is up to date.

Post-apply verification completed at 08:08:33 UTC / 16:08:33 Manila on
2026-10-05. The frozen read-only verifier passed. All 52 existing table counts
and all 26 application-table fingerprints are unchanged. Staging contains
164 surveys, 4 generalized outputs, zero publications, 131 total manifest
entries and the unchanged 77 active entries. Baseline fingerprint digest:
`8ad2415408870c13add7a717762a024f23ac65e23530289febbe4b428ed08342`.

A read-only authenticated database-role check returns 77 compatibility assets
across 62 surveys for the existing platform admin. An anonymous PostgREST call
to the new discovery RPC returns HTTP 401 / `42501`, confirming both API schema
visibility and execution denial. These checks do not replace browser smoke.
Machine-readable evidence is ignored at
`.tmp/dynamic-survey-publishing-20261005/staging-apply-result.json`.

No output was published, verified, promoted or retired; no manifest, MinIO,
NGINX, Auth account, grant or production state changed. The pre-existing
anonymous organization SELECT-grant mismatch remains a separate follow-up.

## User-assisted browser acceptance

On 2026-10-05 the user confirmed all ten supplied browser checks passed:
V3 platform-admin login, survey search/detail, Protected delivery controls,
V2 proxy origin/CSS, admin navigation and existing surveys, orthomosaic/
boundary/basemap rendering, genuine PCD and no-PCD behavior, ordinary-member
scope, denied survey/anonymous asset access, logout and browser health.
This is user-reported acceptance. No publication lifecycle mutation was part
of the checklist; create/verify/publish/retire testing remains separately scoped.

Follow-up on the same day: the user revoked three UEMPC survey grants but still
saw four surveys. A read-only inspection uniquely matched that grant state and
found an active Org Admin membership plus a separate removed historical
membership. Both RLS and published discovery return all four through active
admin scope, while the three explicit grant checks are false. This is expected
role-based access, not a revocation/cache defect. The pending user action is to
change the active membership to Member and retain only AH-026032 granted, then
repeat preview/V2 checks. No membership, grant or organization link was changed.

## Remaining actions

1. Scope and approve any publication lifecycle test records/actions before
   operational verification, publication or retirement; protect current artifacts.
2. Record publication lifecycle acceptance and address findings on a focused
   branch. The permission correction and gate evidence are included in the V3
   session closeout on `development`. V2's existing commit `9c507324` passed
   recording tests 30/30 again and is pushed on `fix/v2-recording-compat`;
   the V2 application remains separate from V3 integration.
3. Production rollout requires separate approval. Review the existing anonymous
   organization-table grant separately; do not silently include that hardening.
