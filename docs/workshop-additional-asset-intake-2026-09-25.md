# Additional Workshop Asset Intake — 2026-09-25

## Outcome

The additional asset allowlist contains 28 unique 2026 surveys. Read-only
drive discovery assigned eight surveys to `Z:\surveys\2026` and twenty to
`X:\surveys\2026`. Every survey has an explicit expected client code,
`round-corners` tiles, and no approved point-cloud file.

The initial, pre-onboarding dry-run preparation completed without an upload:

- 1,366,555 PNG tiles;
- 91,438,193,367 bytes (about 85.16 GiB);
- zero source-layout failures;
- zero missing tile variants;
- zero discovered or unreviewed PCD files; and
- zero generated waves because all 28 survey rows are absent from staging.

The capacity result measured a zero-byte ready set because database readiness
blocked every survey. It is not the final transfer-capacity gate; rerun it
after onboarding so the full 91.44 GB source set is included.

## Source split

- Z drive (8): AH-026016, AH-026029, AH-026032, AH-026043, AH-026045,
  AH-026046, AH-026051, AH-026052.
- X drive (20): AH-026030, AH-026031, AH-026044, AH-026049, AH-026053,
  AH-026054, AH-026055, AH-026056, AH-026057, AH-026058, AH-026059,
  AH-026060, AH-026061, AH-026062, AH-026063, AH-026065, AH-026066,
  AH-026067, AH-026068, AH-026070.

## Initial staging readiness (superseded)

Before the approved onboarding apply, aggregate-only staging checks found:

- AMSKARBEMCO and BARBCO2026 are organization-classified with one canonical
  organization mapping and an eligible owner/operator farm.
- The user confirmed MCS must be organization-scoped. Staging still classifies
  MCS as individual with one confirmed person mapping, so a reviewed canonical
  ownership correction is required before onboarding. Existing MCS surveys are
  AH-026010, AH-026011, AH-026018, and AH-026019; they have no active grants
  or active-manifest entries.
- The inactive `manifest-2026-09-25` draft contains six private MCS entries.
  It must not be reviewed or activated; those entries must be rebuilt with the
  corrected organization ID and organization protection.
- UEMPC is unclassified and lacks canonical owner and eligible-farm mappings.
- BLC is organization-classified but lacks canonical organization and
  eligible-farm mappings.
- TLW and DNG are individual-classified with canonical person mappings but
  have no eligible confirmed owner/operator farm relationship for the
  Platform Admin Dataset Onboarding contract.
- The user confirmed `United Employees Multi-Purpose Cooperative` is the
  canonical database name for UEMPC. The onboarding package must guard the
  current `Unilever Employees Multi-Purpose Cooperative` value and rename it
  atomically with the ownership/farm onboarding.

## Initial safety sequence (completed or superseded)

The staging `manifest-2026-09-25` draft remains inactive. No new batch upload,
wave freeze, manifest review, cutover, or production mutation occurred.

The ignored, checksummed staging onboarding package is now prepared at
`.tmp/workshop-assets/additional-20260925/onboarding-package/`. It creates
three organizations, five canonical farms, 28 draft surveys, 48 primary-farm
relationships, and 19 survey-organization relationships. It corrects MCS to
organization ownership and atomically renames UEMPC to
`United Employees Multi-Purpose Cooperative`.

The exact package passed in disposable local clone
`workshop_additional_onboarding_rehearsal_20260925`:

- rollback rehearsal and baseline restoration;
- commit and all post-apply invariants;
- read-only verification;
- guarded pre-upload containment; and
- clean re-apply plus verification.

The clone was restored from the checksummed September 25 staging backup, then
the already-reviewed inactive manifest draft was applied locally to mirror
current staging. Hosted-only default-privilege ACL statements were the only
restore-harness warnings. No staging mutation occurred.

Final SQL SHA-256 values:

- rehearsal: `1b4b4771dc6d92f8cb73c6ac920e34c2556017ff7229f8997bc4df559efc3d9a`;
- apply: `c13dc42125629361d938079b1ea5ab55d0a108bbc5ea8905848ad4efe2d43b2c`;
- verification: `318da6973e66e8d8b29674fa30ac936e29774a5351f1c99e44f2b3235741a1be`;
- pre-upload containment: `5a9f18e4d2210b3923516721b8dec76fdf1ee730a740cbf597a07e1b4184cf38`.

Steps 1-4 are complete. Step 5 is now running through the guarded sequential
batch described below. The manifest rule remains current: build a later
cumulative manifest from the then-active manifest plus verified entries; never
activate a new-only manifest.

Production remains out of scope.

## Staging onboarding apply

With explicit approval, the checksum-pinned package was applied to
non-production staging `llealjcaqvltrtdwwzrh`. Before the apply, a fresh
checksummed backup was captured under
`backups/staging-additional-onboarding-20260925-preapply/`, and the exact
rollback rehearsal passed.

Post-commit verification passed:

- 28 new draft surveys;
- three new canonical organizations;
- five new canonical farms;
- 48 primary survey-farm relationships;
- 19 confirmed survey-organization relationships; and
- unchanged Auth users, profiles, and survey grants.

No MinIO upload or output-record onboarding was started. The inactive
`manifest-2026-09-25` remains blocked from promotion until its six historical
MCS entries are rebuilt with organization protection.

## Asset migration in progress

After staging onboarding, the preparation dry run completed with all 28
surveys ready. It retained the source inventory of 1,366,555 PNG tiles and
91,438,193,367 bytes, found no PCD files, and generated ten wave job files.
All ten waves were subsequently reviewed and frozen.

The user started the ignored adapted batch runner at
`.tmp/workshop-assets/additional-20260925/run-additional-overnight.ps1`. It
selects the newest reviewed config for each expected additional wave, runs the
ten waves sequentially, stops on failure, and skips already verified waves on
resume. The original private overnight runner was not changed. Adapted runner
SHA-256:
`B21E587C434096C7FD7ED3C653F81F21FABC15AF78F567A59AB5F4D1CE9506B7`.

At session handoff, Wave 001 was running as `20260925-174429` from
`workshop-additional-wave-001-2026-09-25T09-37-36-798Z.jobs.json`; no
additional-wave verification report had completed. The next gate is exact
verification of all ten reports and all 28 surveys. Only then should a
corrected cumulative manifest be assembled. Output-record onboarding remains
deferred; these 28 surveys are orthomap-only and have no PCD/3D output.
