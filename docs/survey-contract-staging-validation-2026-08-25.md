# Survey Contract Staging Validation — 2026-08-25

Target: non-production Supabase project `llealjcaqvltrtdwwzrh`.
Production was not accessed or changed.

## Backup And Restore

Fresh artifacts are retained outside Git under the ignored recovery directory
`backups/staging-survey-contract-20260825/`.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `staging-schema.sql` | 165106 | `849A018C9BBB46E9A9B6814FE17FAC6246A4CAEDB998960EE836F4FA4E4FBF3F` |
| `staging-auth-schema.sql` | 46739 | `1E215DA2A6669CC000494EAB559A07BB98D7143196E6CEDB197F097B6D275ADA` |
| `staging-auth-data.sql` | 302342 | `175E986EE5F9A43DE42C60B440F80DC6C8FB45BB4D234507B803CA5290CE9646` |
| `staging-public-data.sql` | 326563 | `BE666CDAD55C39E821057FFD8B909B4A873BD419C42C53CB3C76329B7940DCA8` |

The unchanged backups restored into an isolated local Supabase PostgreSQL
database after bootstrapping the platform-managed `extensions`, `vault`,
and `supabase_realtime` objects plus the mutually dependent Auth trigger
stub. The application schema replaced the stub with the captured function.
Auth/Public data loaded with triggers disabled only for the isolated circular
foreign-key restore.

Staging and restored counts matched exactly: 24 Auth users, 24 profiles, 20
clients, three organizations, five memberships, three onboarding requests, 144
audit rows, three farms, 108 surveys, 82 orthos, 78 point clouds, and one survey
output.

## Migration Rehearsal And Apply

- Pre-migration restored state: RPC absent; `authenticated` direct update
  allowed.
- Exact migration: RPC present; direct update denied; authenticated RPC
  execution allowed.
- Containment: RPC retained but authenticated execution denied; direct update
  remained denied.
- Exact reapply restored the intended contract.
- Focused pgTAP passed 8/8 on the migrated restore after adding the pgTAP-only
  `extensions` usage grant inside that isolated database.
- Linked dry-run listed only
  `20260825000000_contract_survey_updates.sql`.
- The migration applied successfully. The optional pg-delta cache emitted its
  known missing temporary CA-file warning after apply; independent history and
  contract checks passed.

## Post-Apply Verification

- Remote migration history includes `20260825000000`; a second dry-run reports
  no pending migrations.
- The RPC is security-definer with an empty search path.
- Authenticated execution is granted; anonymous execution is denied.
- Direct authenticated `public.surveys` update is denied.
- The existing survey audit trigger remains present.
- All 108 surveys and all 144 pre-smoke audit rows remain unchanged.
- Linked generated types contain the new RPC contract.
- Full local pgTAP passes 161/161; TypeScript and targeted ESLint pass.
- Linked DB lint reports only the known stale
  `app_private.backfill_legacy_organization_memberships` issue.

Rolled-back database-role smoke passed: platform-admin RPC success generated
one transactional audit row, direct platform-admin table update was denied, and
ordinary-user RPC access was denied.

The signed-in staging application smoke passed on 2026-08-25 at 13:18 Asia/Manila
against deployment commit `dcad51f2` using survey `AH-026005`. The
platform-admin page loaded, identity/client fields remained read-only, an
approved metadata edit persisted and was restored, identity/client values were
unchanged, existing routes and assets continued to load, organization-admin and
ordinary-user editing remained denied, anonymous access was denied, and no new
console or network errors appeared. The survey-contract staging gate is closed.
Production remains unchanged.
