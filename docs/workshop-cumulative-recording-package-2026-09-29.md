# Cumulative recording asset package

Date: 2026-09-29; revised 2026-10-02. Status: staging apply, review and guarded
manifest activation complete; post-activation signed-in smoke pending.

This supersedes September 25 status describing the additional batch as running.
All ten additional waves completed; saved evidence for all 21 waves was
revalidated against the V2 catalog hashes: 58 selected surveys, 3,311,283
objects, 201,134,174,000 bytes. This is not a new full live object verification.

## Local deliverable

The original immutable review evidence remains at
.tmp/workshop-assets/cumulative-20260929/package. The final apply candidate is
at .tmp/workshop-assets/cumulative-20261002-r4/package.
README, package review, manifest entries, per-survey output proposals, date
intake, rollback-only manifest rehearsal SQL, read-only verification, validation
evidence and SHA256SUMS are retained there. Populated operational data stays
outside Git. The adjacent scoped staging inventory is not a recovery backup.

The candidate manifest preserves all eight active entries and adds 69 verified
entries: 58 tile groups and 11 PCDs. Six historical MCS entries use corrected
confirmed organization protection. No routes or object keys change.
The 77 total entries cover 62 surveys: the selected 58 plus four inherited.
The old invalid inactive draft remains untouched and must not be activated.
Existing inherited protection, including legacy DNG organization scope, is
preserved exactly, not silently reclassified.

## Output metadata

Fresh read-only staging inspection confirms 56 missing current orthos and nine
missing current PCD records among surveys with verified assets. The proposal
preserves the two existing rows in each specialized table, all generic
survey_outputs and existing compatibility fields; future inserts should
populate only reviewed matching legacy pointers.

Actual PCD POINTS values were read with eleven bounded 16 KiB loopback range
requests. Two existing point-count values disagree with the uploaded artifacts;
exact evidence is in the private package. No values were overwritten. Confirm
artifact identity/replacement intent before reconciling those rows.

Decision recorded 2026-10-02: preserve the existing current point-cloud rows,
point counts, and `surveys.point_cloud` selections for AH-026012 and AH-026013.
Do not replace or reconcile those current outputs as part of this rollout. The
checksummed review package remains immutable evidence; its future apply package
must treat both rows as preserve-only. The V2 compatibility adapter was
corrected on 2026-10-02: it now requires the survey pointer, current output code
and reviewed URL binding to agree before exposing a PCD.

Fifty-six capture dates remain unknown. Request a reliable survey log or
metadata source; do not invent dates, image counts, GPS errors or quality.
The recording viewer admission gate is now 5 GiB. This is an application gate,
not a promise that a browser can parse and render every multi-GiB PCD; those
files still require recording-machine memory/GPU smoke.

## Validation and next gate

Package invariants and seven deliberately corrupted-input checks pass.
Prepared active-content and canonical-scope SQL guards pass in a staging
read-only transaction. Active-content comparison retains all identity/content
fields but excludes timestamp serialization precision differences.
Fresh checksummed recovery backup
backups/staging-workshop-recording-20261002-preapply was captured. Its Auth and
Public schemas/data restored into isolated database
workshop_recording_rehearsal_20261002 with matching core counts.

The final r4 package passed exact apply and read-only verification: one inactive
draft with 77 entries, 58 selected surveys with orthos, 11 with current PCDs,
and 56 null dates. It also passed containment: pointers and specialized-output
counts returned to baseline while the schema-required inactive empty draft was
retained and marked contained as audit evidence. Earlier r1-r3 candidates are
superseded rehearsal evidence; do not use them. Machine-readable evidence is
retained at .tmp/workshop-assets/cumulative-20261002-r4/rehearsal-result.json.

The user explicitly approved r4 01-apply.sql by exact SHA-256. Staging apply and
read-only post-apply verification passed: 58 current orthos, 11 current PCDs,
56 null dates, one audited package event, and the two decided PCD rows/counts
unchanged. The prior approved manifest remains active. The new 77-entry
manifest remains draft/inactive; no review or activation was performed.
Machine-readable evidence is retained at
.tmp/workshop-assets/cumulative-20261002-r4/staging-apply-result.json.

The user subsequently approved only the review transition. Its rollback
rehearsal and committed exact-entry verification passed, adding one audit row.
The manifest is now reviewed/inactive, with no approval or activation fields
changed. Evidence is at
.tmp/workshop-assets/cumulative-20261002-r4/manifest-review-result.json.

The V2 loopback proxy gate then passed. Anonymous requests remain denied with
private/no-store headers, the internal auth route is not externally exposed,
and the user confirmed an authenticated selected-asset request returns 401 with
no 200 while the replacement manifest is inactive.

The guarded activation package is retained at
.tmp/workshop-assets/cumulative-20261002-activation/package. It atomically:

1. approves the reviewed replacement while it remains inactive;
2. supersedes and deactivates the old active manifest; and
3. activates the replacement.

Any failed guard aborts the transaction. After commit, normal rollback requires
a new superseding manifest; the immutable old manifest must not be directly
reactivated. Fresh pre-activation backup
backups/staging-workshop-recording-20261002-preactivation is checksummed. The
exact rollback rehearsal, baseline restoration, clone-only committed apply,
read-only verification, package checksum verification and final live staging
no-change check pass. `01-activate.sql` SHA-256 is
`3f235e19908d236713f7eef753e26b03f965db47841ba987639156d5bd58587f`.
The user separately approved this exact hash. The guarded staging transaction
and frozen read-only verifier passed: `manifest-2026-10-02` is approved/active
with 77 entries, and the previous manifest is superseded/inactive. Evidence is
at
.tmp/workshop-assets/cumulative-20261002-activation/staging-activation-result.json.
Post-activation anonymous protected access remains 401 with
`Cache-Control: private, no-store, max-age=0`; the external internal-auth route
remains 404.

Next gates are signed-in permitted-user/cross-scope protected asset smoke and
recording acceptance.
Production is untouched.
No Git branch was created, switched or committed.

The independent recording checkout is asimov-hawks V2 on
fix/v2-recording-compat; the current physical checkout remains V3 on
fix/workshop-multi-source-roots. V2's own state files track build/UI blockers.
