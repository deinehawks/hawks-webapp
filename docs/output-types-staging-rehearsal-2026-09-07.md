# Survey Output-Type Staging Backup and Rehearsal — 2026-09-07

Target: non-production Supabase project `llealjcaqvltrtdwwzrh`.

Status: passed. The migration remains pending on staging. Production was not
accessed, and no staging rows, schema objects, Auth records, assets, or
infrastructure were changed.

## Fresh Inventory And Backup

The aggregate inventory ran inside a read-only transaction through the locked
staging resolver. It found two outputs, both `orthomosaic`, with zero
unsupported values, preserved legacy markers, metadata conflicts, or
normalization current-selection collisions.

Fresh recovery artifacts are retained outside Git under the ignored directory
`backups/staging-output-types-20260907/`.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `staging-auth-data.sql` | 300535 | `7CD71D7D93DA8C69C6A81AF209961F0C9EC22B81CFFFFF7243F8C8B639A1500D` |
| `staging-auth-schema.sql` | 46739 | `1E215DA2A6669CC000494EAB559A07BB98D7143196E6CEDB197F097B6D275ADA` |
| `staging-public-data.sql` | 407398 | `FE8EE8D53E5B68535C87D5C925B37DE3F0262F640712EC368C1EFBC8280F9AA0` |
| `staging-schema.sql` | 169044 | `16BDAED194228894454F62E6D7DA2EF367164BBC75AABBB386BEDE0B900E758B` |

Hashes calculated again after copying the files into the database container
matched all four host hashes.

## Isolated Restore

The unchanged artifacts restored into isolated local database
`output_types_rehearsal_20260907`. The validated restore procedure uses the
local `supabase_admin` owner, bootstraps the platform-managed `extensions`,
`vault`, `supabase_realtime`, and `app_private` schemas plus the Realtime
publication and mutually dependent Auth trigger stub, then restores Auth and
application schemas. Auth/Public data loads with triggers disabled only inside
the clone to handle the dump's documented circular foreign keys.

All 27 compared counts matched staging with zero mismatches. Representative
counts were 24 Auth users, 24 profiles, 22 clients, four organizations, five
memberships, three organization user requests, 200 audit rows, three farms,
136 surveys, 82 orthos, 78 point clouds, and two survey outputs.

Two setup checks failed before data load and were resolved without weakening
the artifacts: the non-superuser `postgres` role could not enter the dump's
`supabase_admin` role, and a fresh database did not contain the managed
Realtime publication. Each partial clone was discarded before a clean retry.
These were isolated bootstrap requirements, not migration regressions.

## Migration, Containment, And Tests

The rehearsed files were checksummed before copying:

| Role | Bytes | SHA-256 |
| --- | ---: | --- |
| Migration | 1952 | `C22C0B2422AFD8A919E299878E6B9D34E93CEC518D2B850982EA09E7E1C337BB` |
| Containment | 674 | `F7C893DCB0A376685B250128A37C8874EA33678CB953946A257C1C550E0486C9` |
| Inventory | 2173 | `6AC0538F07678925792CE6FEF13B3B6AB5F9F73190670814ADD8775045171842` |
| Focused pgTAP | 6996 | `F05EA45F09458D39D4BAA82B0A8241AD5E6ACF6DE084102F4E82861D00C7BA9C` |

Before migration, the restored clone had the broad
`survey_outputs_type_format` constraint. The two output rows had SHA-256
fingerprint
`8c77ba1fdbd21d29420bcbe787b01994dfbff0e4a50bb04246a8d201a081c703`.

- Exact migration apply passed and reported `UPDATE 0`.
- The broad format constraint was removed; the exact four-value allowed
  constraint exists and is validated.
- Output count, values, metadata inventory, and row fingerprint were unchanged.
- Focused output-operation pgTAP passed 21/21 with zero failures.
- Unconfirmed containment failed closed with its required guard message and
  left the strict constraint intact.
- Confirmed containment restored the broad format constraint without changing
  the row fingerprint.
- Exact reapply restored the strict validated constraint, again with
  `UPDATE 0`, unchanged fingerprint, and focused pgTAP 21/21.

The clone image lacks the `pg_prove` executable. The same pgTAP SQL was run
directly through `psql`, requiring exactly 21 `ok` results, zero `not ok`
results, and a zero process exit status.

## Remaining Gate

`npx supabase db push --dry-run --linked` completed successfully and listed
only `20260904000000_restrict_survey_output_types.sql`. The dry-run explicitly
did not push it.

A separate explicit approval is still required before applying this one
migration to staging. After apply, verify remote history, no pending
migrations, the output constraint and aggregate inventory, linked types,
database lint, full pgTAP, TypeScript, focused ESLint, and authenticated
platform-admin plus denied-role behavior. Production remains separately
prohibited.
