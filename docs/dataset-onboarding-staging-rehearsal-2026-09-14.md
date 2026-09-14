# Dataset Onboarding Staging Rehearsal — 2026-09-14

## Scope and target

- Feature branch: `feature/dataset-onboarding`
- Branch base: `development` / `origin/development` at `6653aa45`
- Approved non-production staging project: `llealjcaqvltrtdwwzrh`
- Migration rehearsed: `20260911000000_platform_admin_dataset_onboarding.sql`
- Staging was queried read-only. No migration or data mutation was applied remotely.

## Read-only staging inventory

The aggregate-only inventory ran inside a read-only transaction and exposed no
names, emails, record identifiers, or asset paths.

| Check | Result |
| --- | ---: |
| Active farms | 3 |
| Active people | 5 |
| Active organizations | 4 |
| Individual clients | 5 |
| Organization clients | 5 |
| Unclassified clients | 12 |
| Confirmed farm-organization relationships | 3 |
| Qualifying owner/operator farm-organization relationships | 2 |
| Confirmed farm-person relationships | 0 |
| Qualifying owner/operator farm-person relationships | 0 |
| Case-insensitive duplicate client codes | 0 |
| Case-insensitive duplicate survey IDs | 0 |
| Farms with mixed confirmed owner kinds | 0 |
| Farms with multiple confirmed organization owners | 0 |
| Farms with multiple confirmed private owners | 0 |
| Dataset Onboarding RPCs before migration | Absent |

Private Dataset Onboarding is therefore expected to block on staging until a
selected active person has a separately reviewed, confirmed owner/operator
farm-person relationship. Two of the three confirmed farm-organization
relationships currently qualify. The feature does not create or repair those
relationships.

## Checksummed backup

Fresh backup directory: `backups/staging-dataset-onboarding-20260914/`.
The directory is ignored and was not added to Git.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `staging-auth-data.sql` | 300533 | `135848dc5720acf34cc4b24c1e43f48439506a0f4e67cabba4ff6ed4f4c4e3ce` |
| `staging-auth-schema.sql` | 46739 | `1e215da2a6669cc000494eab559a07bb98d7143196e6cedb197f097b6d275ada` |
| `staging-public-data.sql` | 410196 | `09de57ae69b9807e5504bc2d571a4993ab07357495b807e9f73937f8f033d979` |
| `staging-schema.sql` | 169125 | `93414125c76fb29c1b3371f3ae45f8f242a5cd1d37d198c3dfdc5d13390d0398` |

The expected pg_dump circular-foreign-key warnings were retained as operator
evidence. Trigger disabling was used only while restoring into the disposable
local clone.

## Isolated restore and migration rehearsal

- Final clone database:
  `dataset_onboarding_rehearsal_owner_operator_20260914`
- Restored representative counts included 24 Auth users, 24 profiles, 22
  clients, 4 organizations, 5 people, 3 farms, 136 surveys, and 203 audit rows.
- All 48 compared Auth/Public base tables matched staging after excluding only
  `auth.schema_migrations`, which the Auth data dump intentionally omits as
  managed migration history.
- The exact migration applied successfully in the clone.
- Both public RPCs were `SECURITY DEFINER`, had an empty search path, allowed
  `authenticated`, denied `anon`, and left the private validator inaccessible
  to both roles.
- The relevant-row SHA-256 fingerprint stayed
  `8094f7ecf0a9b4ab5dd39bcc526903d113ce8f9965e28c3a26bc01af6ac367e9`
  across containment and re-application.
- Unconfirmed containment failed closed. Rehearsal found and fixed an owner-role
  issue: containment now verifies dynamically that the operator can assume the
  deployed functions' actual owner, verifies both grants are absent, and fails
  instead of reporting ineffective success. This remains portable where a
  disposable clone and hosted Supabase assign different function owners.
- Confirmed containment revoked only authenticated RPC execution, retained the
  functions and data, and exact migration re-application restored the intended
  grants.
- Focused pgTAP passed 37/37 in the staging clone. A restore-harness-only
  `extensions` schema usage grant, omitted by the scoped schema dump, was
  mirrored from standard local Supabase before running pgTAP.
- Final review changed the existing-survey conflict lookup to be
  case-insensitive; the focused fixture now verifies a lowercase historical ID
  is blocked by an uppercase request.
- Farm eligibility was tightened after domain review: only confirmed `owner`
  or `operator` relationships qualify. Confirmed `contact` and `representative`
  relationships are explicitly rejected by focused tests. The updated clone
  restored with all 48 compared table counts matching staging and passed exact
  migration, containment, reapply, fingerprint, and pgTAP checks.

Final rehearsed artifact checksums:

| Artifact | SHA-256 |
| --- | --- |
| Migration | `5473d589cb5744e5d268746ed7dced88623f6d2229e163cdea082cc0efa5cf55` |
| Containment | `bd2e2f3a334ab65c20db51e593c2a3ccf43a440293a3217b2b348240271aa79c` |
| Inventory | `cafb8eff0f44d950aad8850e3dad0d49c4dc3bf357f2f332fad07b35e08c0b5e` |
| Focused pgTAP | `fa63b16c5ad452f37271a50ac23c7a73b769ae553da8c8a74c6141b68408e55b` |

## Final local and linked gates

- Clean local Supabase reset: PASS; every migration replayed.
- Database lint: only the known stale
  `app_private.backfill_legacy_organization_memberships` finding.
- Focused Dataset Onboarding pgTAP: 37/37 PASS.
- Full pgTAP: 208/208 PASS across 12 files.
- Workshop asset regression: 18/18 PASS.
- Next route type generation: PASS.
- TypeScript: PASS.
- Targeted ESLint: PASS.
- Authored-file whitespace: PASS.
- Linked hosted type generation after rollout restored the PostgREST marker and
  produced no extra EOF blank in `lib/database.types.ts`.
- Linked `supabase db push --dry-run --linked`: PASS; it lists only
  `20260911000000_platform_admin_dataset_onboarding.sql`.

## Rollout follow-up

- After separate explicit approval, exactly the rehearsed migration was applied
  to non-production staging and its history, definitions, privileges, inventory,
  and linked generated types were verified. See
  `docs/dataset-onboarding-staging-rollout-2026-09-14.md`.
- The signed-in hosted UI smoke remains. Organization onboarding can be
  exercised with confirmed staging data; private onboarding remains blocked
  until its farm-person prerequisite exists.
- Production, Wave 3, MinIO relocation, asset upload, manifest generation, and
  account invitations remain out of scope.
