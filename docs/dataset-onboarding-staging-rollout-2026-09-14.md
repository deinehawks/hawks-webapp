# Dataset Onboarding Staging Rollout — 2026-09-14

## Scope

- Target: non-production Supabase staging project `llealjcaqvltrtdwwzrh`
- Source branch: `feature/dataset-onboarding`
- Source commit: `9d5797eb589ad59c466e0dbe2ab66df1f230bf64`
- Applied migration: `20260911000000_platform_admin_dataset_onboarding.sql`
- Production, Wave 3, MinIO, assets, and onboarding records were out of scope.

## Pre-apply gate

- Working tree was clean and the source branch was synchronized with its remote
  commit.
- Migration SHA-256 was
  `5473d589cb5744e5d268746ed7dced88623f6d2229e163cdea082cc0efa5cf55`.
- The four staging backup files retained their rehearsed byte sizes and SHA-256
  hashes under the ignored
  `backups/staging-dataset-onboarding-20260914/` directory.
- Linked dry-run listed exactly
  `20260911000000_platform_admin_dataset_onboarding.sql`.
- The user explicitly approved applying that single migration to the named
  non-production project.

## Apply result

The linked CLI applied the migration successfully. Its optional pg-delta
catalog-cache step then warned that a temporary CA file was absent. Direct
database verification, rather than that cache step, was used as rollout
evidence.

The migration is function-only. It created/replaced the private validator and
two public RPCs and changed no onboarding records.

## Direct remote verification

All checks ran in a read-only transaction after apply.

- Remote migration history contains exactly one row for version
  `20260911000000`.
- The preview RPC, commit RPC, and private validator all exist.
- All three functions are owned by `postgres` on hosted staging.
- All three are `SECURITY DEFINER` with an empty search path.
- `authenticated` can execute the two public RPCs.
- `anon` cannot execute either public RPC.
- `authenticated` cannot execute the private validator.
- The validator definition contains the confirmed `owner`/`operator` farm
  eligibility rule.
- Post-apply linked dry-run reports that the remote database is up to date.

Aggregate post-apply inventory:

| Check | Result |
| --- | ---: |
| Active farms | 3 |
| Active people | 5 |
| Active organizations | 4 |
| Confirmed farm-organization relationships | 3 |
| Qualifying owner/operator farm-organization relationships | 2 |
| Confirmed farm-person relationships | 0 |
| Qualifying owner/operator farm-person relationships | 0 |
| Case-insensitive duplicate client codes | 0 |
| Case-insensitive duplicate survey IDs | 0 |
| Mixed or multiple confirmed client-owner conflicts | 0 |

Organization onboarding has two qualifying farm relationships available for a
reviewed smoke. Private onboarding remains fail-closed until a confirmed
owner/operator `farm_people` relationship is separately reviewed and created.

## Containment artifact verification

Hosted staging owns the deployed functions as `postgres`, while the disposable
rehearsal clone owns them as `supabase_admin`. The guarded containment artifact
therefore checks dynamically that the current operator can assume each deployed
function's actual owner instead of hardcoding either role.

The final artifact was tested only in the disposable clone, not executed on
staging. Missing confirmation failed closed; confirmed execution by a role that
could not assume the function owner failed closed; confirmed execution by the
owner removed both authenticated grants. Exact migration re-application restored
the intended grants. The relevant-row fingerprint stayed
`8094f7ecf0a9b4ab5dd39bcc526903d113ce8f9965e28c3a26bc01af6ac367e9`.

Containment SHA-256:
`bd2e2f3a334ab65c20db51e593c2a3ccf43a440293a3217b2b348240271aa79c`.

## Linked generated types

`lib/database.types.ts` was regenerated from linked staging after the apply.

- The hosted PostgREST `14.5` marker returned.
- Both Dataset Onboarding RPC contracts remain present.
- The hosted generator added parentheses around five generic conditional type
  helpers; these are generator-formatting changes, not schema changes.
- Generated-file whitespace check passes with no extra EOF blank.
- TypeScript passes.

## Hosted staging UI smoke

The user completed the signed-in no-mutation smoke in Chrome against the
staging-connected application.

- Platform-admin sign-in, sidebar navigation, and page loading passed.
- New- and existing-client organization previews passed, including derived
  compatibility values and explicit confirmation requirements.
- Preview produced zero mutations, and editing any input invalidated it.
- Duplicate IDs, case-insensitive duplicates, existing IDs, the 100-ID limit,
  farm-owner mismatches, and inline validation errors all failed closed.
- Private onboarding correctly remained blocked because staging has no
  qualifying confirmed owner/operator farm-person relationship.
- Ordinary users and organization admins were denied; anonymous users were
  redirected to sign in.
- Chrome reported no console errors, failed application requests, or unexpected
  behavior.

## Remaining gates

1. Push the follow-up commit containing this final smoke evidence.
2. Open and review the pull request, then merge into `development` only while
   its checks and focused diff remain clean.
3. Deploy the merged `development` branch and complete a short post-merge
   no-mutation smoke.
