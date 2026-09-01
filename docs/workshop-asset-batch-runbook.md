# Workshop asset batch runbook

This workflow publishes only explicitly reviewed 2026 workshop tiles and point clouds from `Z:\surveys\2026` to staging MinIO. Asset commands never change Supabase rows or activate a workshop manifest. The separate onboarding command generates review-only SQL and never executes it.

## Safety contract

- Keep the real allowlist at `.tmp/workshop-assets/allowlist.json`; it is ignored by Git.
- `AH-026012` and `AH-026013` may be selected when explicitly approved; the earlier exclusion decision was withdrawn on 2026-08-26.
- Every survey must have one staging survey row and canonical client. Organization scope requires one confirmed primary active-organization mapping plus one matching confirmed survey relationship. Private scope requires one confirmed primary person mapping, no confirmed primary organization mapping, and no survey-organization relationship.
- Preparation uses explicit database connection settings when present; otherwise it validates and uses the repository's linked staging pooler metadata with `SUPABASE_DB_PASSWORD`.
- Every PCD must be explicitly approved or ignored with a reason. Unreviewed PCDs block preparation.
- Waves contain at most three surveys.
- MinIO must retain the larger of 15% capacity or 100 GiB after the remaining transfer plus 10% overhead.
- Per-wave uploads emit verified entry JSON, not manifest SQL. One combined review-only manifest draft is generated only after all 30 expected surveys have exactly one complete verification report.

## Database onboarding prerequisite

Every selected survey, client, and confirmed canonical mapping must exist in
staging before preparation can generate upload waves. Preparation is read-only:
it reports missing onboarding and never creates Supabase records.

The current Platform Admin UI can create an organization at
`/admin/organizations/new`, map an existing client, and edit metadata for an
existing survey. It cannot create a new client, create a new survey, or
batch-onboard surveys. For the current workshop batch, missing clients,
confirmed primary client-organization mappings, surveys, and confirmed
survey-organization relationships must be created through a separately
reviewed staging-only transaction. Verify duplicates, immutable survey/client
compatibility fields, relationships, and authorization scope before rerunning
preparation. Production remains out of scope.

Prepare the private intake without mutating staging:

```powershell
npm run workshop-onboarding:prepare
```

Review `.tmp/workshop-assets/onboarding/preview.json`, then inspect both SQL
drafts. The rehearsal file ends in `rollback`; the apply file ends in
`commit`. Before either remote write-capable execution, take a checksummed
staging backup and obtain explicit approval. Never run the apply draft against
production.

For a reviewed pre-existing client, `client.expectedExistingId` may pin the
transaction to the confirmed UUID. The preview reports current and target
classifications separately so an approved `unclassified` to
`organization` transition is visible before mutation.

Validate the generated transaction against the disposable local database with
`npm run workshop-onboarding:rehearse-local`. This seeds only the local
transaction, runs the generated SQL, checks the 30-survey and scope invariants,
and rolls everything back.

## Dual scope and individual account boundary

The preparer and publisher support explicit `organization` and `private`
scopes. Private datasets use canonical `people` plus confirmed
`client_people`, a null manifest organization, and
`protection_level = 'private'`. Never fabricate a one-person organization.

Migration `20260826000000_harden_workshop_asset_scopes.sql` must pass the
normal non-production database gate before any private manifest is approved.
Private authorization permits platform admins or an active explicit
null-organization survey grant; anonymous, unrelated, expired, revoked, and
scope-mismatched requests fail closed.

The active staging manifest contains legacy organization-labeled entries that
predate canonical survey-organization relationships, including two
null-organization individual entries. The migration intentionally preserves
their existing `domain_can_read_survey` behavior. Strict canonical mapping
requirements apply to newly generated private entries; correcting legacy
labels happens only through the later combined superseding manifest.

No-organization signup and dashboard client selection remain deferred. Until
that separate task is complete and grants are issued, the 17 private workshop
datasets are platform-admin-only.

## Prepare and review

1. Copy `scripts/workshop-assets-allowlist.example.json` to `.tmp/workshop-assets/allowlist.json` if the private file does not exist.
2. Add only approved surveys, tile variants, and exact PCD paths. Add unfinished PCDs to `ignoredPointClouds` with a reason and review date.

Use these field shapes inside the private file:

```json
{
  "pilotSurveyIds": ["<PILOT-SURVEY-ID>"],
  "approvedSurveys": [
    { "surveyId": "<SURVEY-ID>", "tileVariant": "sharp-corners", "includeTiles": true, "scope": "organization" }
  ],
  "approvedPointClouds": [
    { "surveyId": "<SURVEY-ID>", "sourceFile": "Z:\\surveys\\2026\\<SURVEY-ID>\\rgb\\3d\\<FILE>.pcd" }
  ],
  "ignoredPointClouds": [
    { "surveyId": "<SURVEY-ID>", "sourceFile": "Z:\\surveys\\2026\\<SURVEY-ID>\\rgb\\3d\\<FILE>.pcd", "reason": "processing incomplete", "reviewDate": "2026-08-25" }
  ]
}
```

`pilotSurveyIds` is optional. When present, those unique approved surveys
form the first wave in the listed order. The pilot cannot exceed
`maxSurveysPerWave`; all remaining surveys are grouped normally.

3. Run `npm run workshop-assets:prepare` for the 13-survey organization
   allowlist. Prepare the private split separately with:
   `npm run workshop-assets:prepare -- --allowlist .tmp/workshop-assets/allowlist-private.json --output-root .tmp/workshop-assets/private`.
   The command reports per-survey progress and uses bounded file-metadata concurrency (default 16, configurable with `WORKSHOP_ASSET_STAT_CONCURRENCY` from 1 through 64).
4. Review `inventory.json`, `capacity-assessment.json`, `blocked-items.json`, and every generated wave job under `.tmp/workshop-assets`.
5. Freeze one reviewed wave with `npm run workshop-assets:review -- --config .tmp/workshop-assets/generated/workshop-organization-wave-001.jobs.json`.
6. Do not edit the reviewed JSON or its SHA-256 sidecar.

An empty allowlist succeeds without querying staging or generating upload jobs.

## Background upload

Start exactly one reviewed wave:

```powershell
npm run workshop-assets:runner -- start -Config .tmp/workshop-assets/reviewed/<reviewed-file>.jobs.json
```

Monitor or stop it:

```powershell
npm run workshop-assets:runner -- status
npm run workshop-assets:runner -- stop
```

The runner uses a single lock, hidden background process, frozen config copy, PID metadata, and separate output/error logs. `stop` requests a graceful halt between batches rather than terminating an in-flight multipart upload. Uploads stream through multipart S3 with retries, resume by checking existing object sizes, and verify every object with `HeadObject`. State and verification JSON use atomic replacement so a failed local write does not truncate prior progress. A zero-byte state file from the pre-fix workflow is treated as empty state and recovered through remote object-size checks; malformed non-empty state still fails closed.

After each success, review its verification JSON and manifest-entry JSON under
`.tmp/workshop-assets/verification`. Do not create or activate a partial
manifest. After every survey listed in
`.tmp/workshop-assets/manifest-expected.json` has exactly one complete report,
run `npm run workshop-assets:manifest`. Review the resulting combined SQL and
hash inventory, then use only the separately approved staging manifest
workflow. Production remains out of scope.
