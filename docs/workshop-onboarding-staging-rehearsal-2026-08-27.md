# Workshop Onboarding Staging Rehearsal - 2026-08-27

Target: non-production Supabase project `llealjcaqvltrtdwwzrh`.
Production was not accessed or changed.

This gate covered read-only staging drift checks, fresh checksummed backups,
an isolated restore, exact authorization-migration rehearsal, and both
rollback- and commit-form onboarding validation. It did not authorize or
perform a staging migration, onboarding mutation, asset upload, manifest
change, grant, or Auth-user change.

## Read-only staging preflight

The refreshed private preview still contains 30 selected surveys and zero
conflicts. Its selected-record inventory remains:

- four existing clients;
- two existing canonical organizations;
- no selected canonical people or client-person mappings yet;
- two existing surveys;
- two existing client-organization mappings;
- no selected survey-organization relationships.

The linked migration dry-run reports exactly one pending file:
`20260826000000_harden_workshop_asset_scopes.sql`.

## Backup and restore

Fresh artifacts are retained outside Git under the ignored recovery directory
`backups/staging-workshop-onboarding-20260826/`.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `staging-schema.sql` | 167053 | `44C5A3AD2C4A242809E33DCD983257B0B0511AD7D2B05CD4E108F9D38FABDDA4` |
| `staging-auth-schema.sql` | 46739 | `1E215DA2A6669CC000494EAB559A07BB98D7143196E6CEDB197F097B6D275ADA` |
| `staging-auth-data.sql` | 303088 | `998BF14DB6340C26A8F9C0F259A3F01936066B3228A66E149A596BE31ECA58C3` |
| `staging-public-data.sql` | 372603 | `7F654445ED03510E8B3980A2AA9C950AC35B49CBB3953546F5F6FA85119B2851` |

The files restored into disposable local database
`workshop_rehearsal_20260826`. Every captured Auth/Public data-table count
matched staging. Supabase intentionally omits the platform-managed
`auth.schema_migrations` rows from its Auth data dump; staging has 77 and the
restored clone has none. This is not account or application data.

## Migration and onboarding rehearsal

The exact authorization migration SHA-256 was
`ED6119E83D86C1B6B112C24F69D1C341F703CFF346E17CD392D2A3FC3123A0DA`.
It applied successfully to the restored clone.

The generated onboarding artifacts were frozen for this rehearsal:

| Artifact | SHA-256 |
| --- | --- |
| rollback rehearsal | `3AF3067E4380C8707B02A822B9FF41F7EF7F9CA7F1C0ED024FE1A59F5CD8B7C8` |
| commit form | `2925F6218608A49ED1F87681BC3471C02F09CFA78D236FC830B6F6168529D5B4` |

The rollback form passed its 30-survey and six-client classification checks,
then restored affected counts to 20 clients, three organizations, two people,
two client-person mappings, two client-organization mappings, 108 surveys,
and two survey-organization relationships.

The commit form was then executed only in the disposable clone. Verification
passed:

- exactly 30 selected surveys exist;
- 28 inserted surveys are `draft`;
- all selected code/access-code/client compatibility values match and
  `organization_code` remains null;
- the 17 private surveys have zero organization relationships;
- all 13 organization surveys have the expected confirmed relationship;
- all three individual clients have exactly one confirmed primary person;
- all three organization clients have exactly one confirmed primary active
  organization mapping;
- the confirmed existing BSBG client is pinned by UUID in the ignored private
  intake, changes from `unclassified` to `organization`, maps to one active
  `cooperative` organization, and has all five expected confirmed survey
  relationships;
- Auth users and profiles remain 24 each;
- survey grants remain unchanged at four;
- post-onboarding totals are 22 clients, four organizations, five people,
  five client-person mappings, three client-organization mappings, 136
  surveys, and 15 survey-organization relationships;
- the explicit `workshop_batch_onboarding` audit row exists.

The BSBG confirmation changed the generated SQL hashes after the first
rehearsal. The updated artifacts were replayed from the untouched checksummed
staging backup in fresh disposable database
`workshop_rehearsal_bsbg_20260827`. Both rollback and commit forms passed;
the earlier hashes are superseded and must not be used for staging.

## Authorization validation

Focused pgTAP passed 16/16 against the migrated, onboarded real-data clone:
nine private-scope assertions and seven existing organization/legacy
assertions.

The complete clean-database suite passed 170/170 across 11 files. Full-suite
execution is intentionally kept on the clean local database because some
historical tests assert global fixture row counts; those assumptions do not
hold on a restored staging clone with 136 surveys. Clone-only fixture
adjustments were limited to neutralizing a duplicate test email, deactivating
the restored active manifest while fixture manifests ran, granting local-only
pgTAP schema usage, and clearing clone audit history only after the onboarding
audit was verified.

## Staging apply

The user explicitly approved the staging migration and onboarding transaction.
Migration `20260826000000` applied successfully. Independent verification
confirmed its remote history, security-definer and empty-search-path contract,
organization/private branches, explicit-grant and null-organization checks,
direct anonymous/authenticated execution denial, and no remaining migrations.
The CLI's post-apply pg-delta cache emitted the previously observed missing
temporary CA-file warning; independent checks passed.

The exact reviewed onboarding apply artifact then committed under a
single-session advisory lock. Post-commit verification confirmed:

- 30 selected surveys and 28 inserts;
- zero private survey-organization relationships;
- 13 confirmed organization survey relationships;
- zero survey compatibility mismatches;
- unchanged Auth-user, profile, and survey-grant counts;
- BSBG classified as `organization`, mapped to an active `cooperative`,
  with all five expected survey relationships.

An independent read-only preview now reports six selected clients, three
organizations, three people, 30 surveys, three client-person mappings, three
client-organization mappings, 13 survey-organization relationships, and zero
conflicts.

The post-onboarding organization asset preparation found all 13 surveys ready,
with zero blocked or unreviewed point clouds. Capacity passes for approximately
51.07 GiB of planned objects. Five local wave files were generated, but none
was reviewed, frozen, or uploaded. Generated Wave 1 currently includes
`AH-026014`; it must be split so the approved pilot contains only
`AH-026012` and `AH-026013` before upload approval.

Production, MinIO objects, manifests, Auth users, and grants remain unchanged.
