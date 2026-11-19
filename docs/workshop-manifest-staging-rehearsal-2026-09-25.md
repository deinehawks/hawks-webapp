# Workshop Manifest Staging Rehearsal  2026-09-25

## Scope and result

- Branch: `ops/workshop-manifest-rollout`
- Base commit: `92dabf5a4a2632e33f22e43ca39abafd8061b00f`
- Target: non-production staging project `llealjcaqvltrtdwwzrh`
- Replacement key: `manifest-2026-09-25`
- Replacement ID: `b07905c4-71ae-4df6-a834-14fbbae13552`
- Expected active predecessor: `manifest-2026-08-11`

The checksummed rollout package is prepared and fully rehearsed in an isolated
local clone. No staging manifest row, approval, activation, asset, Auth record,
or production resource was changed.

## Simplified recovery decision

The optional `backup_storage_alias`, `backup_object_alias`, and
`backup_exported_at` fields remain null. No MinIO manifest-backup bucket,
alias mapping, or fabricated export timestamp is required for this staging
rollout.

Recovery is instead covered by:

- the checksummed staging schema/Auth/Public backup;
- immutable approved and superseded manifest history;
- the original checksummed combined SQL and JSON inventory;
- guarded pre-cutover draft containment; and
- a forward-recovery artifact that clones the previous known-good manifest
  into a new inactive draft without editing superseded history backward.

## Read-only staging inventory

- Exactly one active approved 2026 manifest exists:
  `manifest-2026-08-11`.
- The proposed key did not exist.
- Exactly one project-lead platform-admin profile satisfied the approval
  contract.
- All 30 expected surveys exist with clients.
- All 13 organization surveys and 17 private surveys satisfy their canonical
  scope prerequisites.

Source artifacts:

| Artifact | SHA-256 |
| --- | --- |
| Combined SQL | `f56db2d90a276d3ab7b2f70095f1be390f737a4b3fc063f6bbfc44429091dd36` |
| Combined JSON inventory | `581afc0b858c5eb9760594926e9240c1e984542877359d2f17775ae84999c313` |

The source represents 30 surveys, 41 entries, 1,944,728 objects, and
109,695,980,633 bytes across 11 verification reports.

## Ignored rollout package

Location:

`.tmp/workshop-assets/rollout/manifest-2026-09-25/`

| File | SHA-256 |
| --- | --- |
| `01-draft-apply.sql` | `35d4201fbdd66857e53edb50d9c7743fed4db973ee787cb30ac95f4307ea326a` |
| `02-verify-draft.sql` | `a827ec7a9f0814e16f340b9c6319275eccc53ae8617846c581cdb5481833b154` |
| `03-mark-reviewed.sql` | `c94e977847782f400e1710771eba620f33e1e6e3e20ab86d31edf91c9b8f007d` |
| `04-cutover.sql` | `008cf537b2065ab460b66f8ea315a6c3a313bf628b62d00b4adc23a1cc3145e0` |
| `05-verify-active.sql` | `2ced3f6eacaf3883b9ecbc05eb4d7ff8aeb6560f6dd2aef89439465d49cdbd5e` |
| `06-draft-containment.sql` | `536154cadc0b20904999ec39092762d6d7ef1831e1669c5a8a74e1a854b83a33` |
| `07-forward-recovery.sql` | `107d5e5fd5c61be9eee3b060839f3f8d0e779666b19f4448622e294cd41115cf` |

The package is fail-closed:

- source SQL and JSON hashes must match;
- the expected active predecessor and unused target key are pinned;
- platform-admin RLS/triggers are exercised through an authenticated JWT
  context;
- entry counts, survey counts, artifact types, verification flags,
  survey/client references, and organization/private scope are asserted;
- review, cutover, containment, and recovery require separate confirmation
  settings;
- approval, supersession, and activation occur in one guarded transaction;
  and
- package generation never executes the produced SQL.

## Checksummed staging backup

Ignored location:

`backups/staging-workshop-manifest-20260925/`

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `staging-schema.sql` | 219,006 | `47fa30764ef5bebd82d67072d6b4cbff25a1a85958568b0a0153d711e0422c50` |
| `staging-auth-schema.sql` | 67,847 | `072c7928e8144b6243d3708038f3d2877d92d73871cf5880efbd4d5b7b2d922a` |
| `staging-public-data.sql` | 410,694 | `7b15a8ba132cc17cddd44492af9920eeb03dca27558865ac18905cbf474a13aa` |
| `staging-auth-data.sql` | 301,716 | `78339f720b4b4264f924f2718cf81e7547650e6c7205b1f8faa4f8d27d5d70b6` |

The normal pg_dump circular-foreign-key warnings were retained. The final
schema dumps include object ACLs. The earlier generated no-ACL copy was
removed after the corrected backup was verified.

## Isolated restore and rehearsal

Clone database: `workshop_manifest_rehearsal_20260925`.

- Auth and application schemas, object ACLs, default ACLs, and data restored
  cleanly under the local `supabase_admin` superuser.
- All 53 compared Auth/Public table counts matched staging with zero
  mismatches.
- Representative restored counts included 24 Auth users, 24 profiles, 136
  surveys, five manifests, 13 manifest entries, and 204 audit rows.
- Draft apply inserted one inactive manifest and 41 entries.
- Draft verification returned 30 surveys, 30 tile groups, 11 point clouds,
  17 organization entries, and 24 private entries.
- Confirmed containment removed exactly the 41 entries and inactive draft;
  `manifest-2026-08-11` remained active.
- Reapply, promotion to reviewed, approval, predecessor supersession, and
  activation passed in the required order.
- Post-cutover verification found exactly one active approved 2026 manifest
  with the expected lineage and counts.
- Forward recovery created a new inactive draft with the previous
  known-good manifest's eight entries and four surveys.
- Containment without its confirmation setting failed closed.

Focused rollout-packager tests pass 4/4 and targeted ESLint passes.

## Remaining staging gates

1. Review and commit the tracked rollout tooling and this evidence.
2. Obtain explicit approval before running `01-draft-apply.sql` against the
   named non-production staging project.
3. Run `02-verify-draft.sql`, authorization simulation, and authenticated
   external tile/point-cloud smoke while the new manifest remains inactive.
4. Mark the draft reviewed only after acceptance.
5. Obtain a separate explicit approval before `04-cutover.sql`.
6. Run post-cutover database, normal-user, private-grantee,
   cross-organization, anonymous, and external asset smoke.

Production remains out of scope.
