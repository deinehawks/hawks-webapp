# Individual signup approval: staging rehearsal

Date: 2026-10-09. Target: non-production Supabase project
`llealjcaqvltrtdwwzrh`. Status: implementation, rehearsal, explicitly approved
staging apply, direct verification, TLW account activation, and positive V2
tile acceptance complete. Browser authorization, responsive UI, access-preview,
empty/error-state, and console/network acceptance are complete. Production is
untouched.

## Exact approval scope

Apply only
`supabase/migrations/20261009000000_individual_signup_approval.sql`.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Migration | 4,275 | `3196c7f4f6138f8545766fb8069b924d219b18cf6aaa46d1fc0cc0c05545d8b7` |
| Guarded rollback | 1,656 | `597d0725a1a15638c97f8b0247c51e81ec5ad47cfd86e74a2bbe55002ee2b781` |
| Read-only verifier | 1,744 | `4cbc80d13cb61b4033d23c1ef5cd13042babba261e87d467a65851f555b6f269` |

The linked dry run lists only this migration. Approval covers the schema,
individual-approval RPC, grant-scoped client-row visibility helper, policy
replacement, and migration-history entry. It does not approve an account,
change a membership or grant, publish an asset, or authorize production.

## Read-only staging inventory

- TLW's profile and signup request are both pending.
- The profile remains a normal `user` and has zero organization memberships.
- Active null-organization survey grants already exist for exactly
  `AH-026004` and `AH-026007`, with no expiry.
- Both target surveys exist and belong to the same TLW client row.
- Migration `20261009000000` is absent from remote history.

Because the exact intended grants already exist, rollout must preserve and
verify them rather than create duplicate grants. Account activation and grant
administration remain separate audited actions.

## Fresh backup and recovery evidence

Ignored recovery directory:
`backups/staging-individual-signup-20261009/`.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `staging-schema.sql` | 283,909 | `163ee12ad8ab5600c4dcbea9e6fa8401bd2197dd207baccb4a7f80704586a3d4` |
| `staging-data.sql` | 1,423,342 | `a2e66a660a08c7acef1efc04ea6fd6647874fd75e2c8fdc51ecb540d1c72b010` |
| `staging-roles.sql` | 358 | `4350a72b5ec109888e740c17f3eb4da2fcd95ab73af26499538ed0bf615db543` |

The Auth/Public/app_private schema and data restored into the disposable local
database `individual_signup_rehearsal_20261009`. All 53 compared table counts
matched staging; the pre-migration count digest was
`970650e81e171c887e26c09ce40c2342ff646fc18c5bd4e0ce119ef8de86f551`.
The dump reports known circular foreign keys; the isolated recovery used the
documented trigger-disabled data-restore procedure.

## Migration, rollback, and authorization rehearsal

- Exact migration apply: passed in the restored clone.
- Read-only verifier: passed; the new RPC and helper exist, client SELECT uses
  only the dedicated grant-derived visibility helper, and consumer execute is
  limited to `authenticated`.
- Rollback with a temporary approved individual request: correctly refused.
  The temporary change was transactionally discarded.
- Empty-state rollback: passed.
- Exact migration reapply and verifier: passed.
- Post-reapply staging/clone comparison: all 53 table counts still match.
- Transactional TLW rehearsal: approval produced an active profile, zero
  memberships, exactly `AH-026004` and `AH-026007` visible through RLS, and
  only the TLW client row visible. The rehearsal transaction was rolled back.

Local validation passes focused pgTAP 36/36, full pgTAP 262/262, TypeScript,
targeted ESLint, generated-type review, migration verification, guarded
rollback/reapply, and whitespace checks. Database lint reports only the known
legacy `backfill_legacy_organization_memberships` reference documented before
this change.

## Approved staging apply

The user supplied the exact approval phrase for migration SHA-256
`3196c7f4f6138f8545766fb8069b924d219b18cf6aaa46d1fc0cc0c05545d8b7`.
Preflight rechecked that hash, all three recovery-backup hashes, 53-table count
parity, the pending TLW account state, and a linked dry run containing only
`20261009000000_individual_signup_approval.sql`.

`npx supabase db push --linked --yes` applied that one migration successfully.
The command emitted the previously observed non-blocking pg-delta certificate
cache warning. Independent checks confirm the remote migration-history row,
a clean linked dry run, the frozen verifier contract, and unchanged counts for
all 53 Auth/Public/app_private tables. TLW remains pending with zero
memberships and the same active null-organization grants for exactly
`AH-026004` and `AH-026007`. No account, membership, grant, delivery, asset, or
production mutation occurred during the schema rollout.

## Final staging acceptance

Next:

1. Completed 2026-10-13: `tlw.viz.hawks@gmail.com` was approved as an
   **Individual client**.
2. Completed by direct read-only staging verification: the account is an
   active normal user with zero memberships and exactly active non-expiring
   grants for `AH-026004` and `AH-026007`.
3. Completed: the user confirmed both granted surveys render their
   protected tiles through V2 on port 8082.
4. Completed 2026-10-13: the TLW dashboard shows only the two granted surveys;
   direct access to out-of-scope `AH-026020` is denied; logout/login preserves
   the two-survey scope; and V3 Users & Access agrees with that scope.
5. Completed 2026-11-20: the user confirmed the Signup Approvals responsive
   layout, the explicit TLW Access Preview calculation and empty-farm state,
   the admin error boundary, and clean valid-page console/network behavior.
   The preview reported zero memberships, two effective survey grants, zero
   farms, and the intended AH-026004/AH-026007 scope. A development-only,
   no-write pending-request fixture was used because staging had no pending
   requests; its actions were disabled and the fixture was removed immediately
   after the check. Long identifiers now wrap and approval actions stack on
   narrow screens. No account, membership, grant, asset, or production mutation
   was performed during final acceptance.

Approved phrase retained as rollout evidence:

`approve staging migration 3196c7f4f6138f8545766fb8069b924d219b18cf6aaa46d1fc0cc0c05545d8b7 for individual signup approval`
