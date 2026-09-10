# Survey Output-Type Staging Rollout — 2026-09-10

Target: non-production Supabase project `llealjcaqvltrtdwwzrh`.

Status: staging database rollout and local-application-to-staging smoke passed.
Migration `20260904000000_restrict_survey_output_types.sql` is applied to
staging. Production was not accessed. A hosted staging deployment smoke remains
pending after branch integration and deployment.

## Approval And Preflight

The user explicitly approved applying only migration `20260904000000` to the
named non-production project. Immediately before apply:

- the locked resolver confirmed the target project;
- staging still contained two outputs, both `orthomosaic`, with no unsupported
  values, legacy-metadata conflicts, or current-selection collisions;
- the output-row fingerprint remained
  `8c77ba1fdbd21d29420bcbe787b01994dfbff0e4a50bb04246a8d201a081c703`;
- all four ignored recovery artifacts retained the SHA-256 hashes recorded in
  `docs/output-types-staging-rehearsal-2026-09-07.md`;
- the migration retained SHA-256
  `C22C0B2422AFD8A919E299878E6B9D34E93CEC518D2B850982EA09E7E1C337BB`;
- linked dry-run listed only `20260904000000_restrict_survey_output_types.sql`.

## Apply And Remote Contract

The linked push completed successfully and applied only the approved migration.
The CLI then emitted the previously documented optional pg-delta catalog-cache
warning because its temporary CA file was absent; the warning occurred after
the migration applied and did not affect the independent verification.

Post-apply checks confirmed:

- exactly one remote migration-history row for version `20260904000000`;
- validated constraint `survey_outputs_type_allowed` containing exactly
  `orthomosaic`, `point_cloud`, `object_detection`, and `other`;
- removal of the prior broad format constraint;
- two unchanged output rows, both approved types, with the original fingerprint;
- zero preserved legacy values, unsupported values, metadata conflicts, or
  normalization collisions;
- a second linked dry-run reported the remote database up to date.

Linked type generation matched the checked-in database schema declarations.
The only diff was generator-version formatting around generic conditional
types, so `lib/database.types.ts` was intentionally left unchanged.

## Authorization And Regression Verification

A direct staging smoke ran inside an outer transaction and rolled back every
case:

| Case | Result |
| --- | --- |
| Platform admin inserts `other` | allowed |
| Platform admin inserts `report` | rejected, SQLSTATE `23514` |
| Ordinary authenticated user inserts `other` | denied, SQLSTATE `42501` |
| Anonymous role inserts `other` | denied, SQLSTATE `42501` |

The before/after snapshots were identical and staging retained exactly two
output rows. The smoke created no persistent records or audit entries.

Post-apply automated validation passed:

- linked database lint: only the known stale
  `app_private.backfill_legacy_organization_memberships` reference;
- full pgTAP: 11 files, 171/171;
- workshop regression: 18/18;
- Next route type generation;
- TypeScript;
- focused ESLint for the changed Admin output files;
- whitespace validation.

## Signed-In Application Smoke

The user tested the current branch through
`http://localhost:8080/asimov-hawks/admin` in Chrome and confirmed its
Supabase requests targeted project `llealjcaqvltrtdwwzrh`. This validates the
post-migration UI/database combination without claiming a hosted deployment.

- platform-admin sign-in passed;
- the new selector contained exactly the four approved values;
- a draft edit persisted and its original values were restored;
- the archived output remained locked;
- draft/current eligibility rendered correctly;
- an ordinary user was redirected from Admin to `/dashboard`;
- an anonymous user was redirected to `/auth/login`;
- no console errors, failed network requests, or unexpected behavior occurred.

## Remaining Gate

After this branch is integrated and deployed, run a short hosted staging smoke
for sign-in, the four-value selector, locked/current presentation, denied-role
redirects, and browser console/network health. No additional staging data
mutation is required for that deployment check. No production rollout is
authorized.
