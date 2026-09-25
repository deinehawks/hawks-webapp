# Workshop Asset Migration Completion

Date: 2026-09-25

Status: all 30 selected staging surveys have complete asset verification;
combined manifest draft generated for review only; no manifest database change
has been applied.

## Verified waves

Organization scope:

| Wave | Surveys | Objects | Bytes |
| --- | ---: | ---: | ---: |
| 001 | 2 | 37,868 | 6,705,469,416 |
| 002 | 3 | 383,975 | 24,142,306,973 |
| 003 | 3 | 505,728 | 21,352,293,342 |
| 004 | 3 | 39,982 | 2,402,299,098 |
| 005 | 2 | 4,137 | 233,016,746 |

Private scope:

| Wave | Surveys | Objects | Bytes |
| --- | ---: | ---: | ---: |
| 001 | 3 | 78,082 | 8,489,013,117 |
| 002 | 3 | 344,084 | 11,716,938,206 |
| 003 | 3 | 122,047 | 10,387,480,670 |
| 004 | 3 | 307,472 | 15,328,017,972 |
| 005 | 3 | 74,346 | 4,932,149,756 |
| 006 | 2 | 47,007 | 4,006,995,337 |

Combined totals:

- 30 unique surveys.
- 11 completed verification reports.
- 41 artifact manifest entries.
- 1,944,728 verified objects.
- 109,695,980,633 verified bytes.

Every report has `completedAt`, every capacity check is allowed, and the
expected staging/2026 inventory has no missing, unexpected, or cross-report
duplicate survey. Multiple entries for one survey within the same report are
intentional when it has more than one artifact type.

The supported runner reports stopped after Private Wave 006. Its process has
exited, stderr is empty, and its final report verifies 47,007 objects.

## Combined review-only draft

Generated files:

- `.tmp/workshop-assets/verification/combined-manifest-draft.sql`
- `.tmp/workshop-assets/verification/combined-manifest-draft.sql.json`

SHA-256:

- SQL: `f56db2d90a276d3ab7b2f70095f1be390f737a4b3fc063f6bbfc44429091dd36`
- JSON inventory: `581afc0b858c5eb9760594926e9240c1e984542877359d2f17775ae84999c313`

The SQL contains two insert statements and no update, delete, approval, or
activation statement. It retains `:new_manifest_id` and `:new_manifest_key`
placeholders and must not be executed directly. It has not been applied to
staging or production.

## Filesystem retry branch

Branch `fix/workshop-share-retries` was committed as `92dabf5a` and pushed.
Its focused change
retries recognized transient `readdir` and `stat` failures with visible bounded
backoff for approximately 60 seconds. Persistent transient failures and all
non-transient failures remain fail closed. The workshop asset suite passes
24/24, including retry recovery, exhausted retry, and non-transient failure
coverage.

## Next gate

1. The combined SQL/JSON, read-only staging inventory, checksummed backup, and
   exact draft/containment/cutover/forward-recovery package are reviewed and
   rehearsed. See
   `docs/workshop-manifest-staging-rehearsal-2026-09-25.md`.
2. Obtain explicit approval before applying the inactive draft to
   non-production staging.
3. Do not approve, activate, or supersede the current manifest until the new
   draft passes staging authorization and external asset smoke.
4. Production remains out of scope without separate approval.
