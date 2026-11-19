# Dataset Onboarding Local UI Smoke

Date: 2026-09-11

Branch: feature/dataset-onboarding

Base: synchronized origin/development at 6653aa45

Environment:

- Application: http://localhost:8080/asimov-hawks
- Database/Auth: disposable local Supabase at 127.0.0.1:54321
- Hosted staging and production were not used or changed.

The user completed the signed-in workflow with a local platform-admin account
and local-only ownership fixtures.

Results:

- Local Supabase host confirmed: PASS
- Platform-admin access: PASS
- New organization preview: PASS
- Preview invalidation after input changes: PASS
- Organization batch commit: PASS
- Created survey links and details: PASS
- Existing private-client preview: PASS
- Duplicate request-ID conflict: PASS
- Existing survey-ID conflict: PASS
- Farm-owner mismatch: PASS
- Inline field errors: PASS
- Ordinary-user redirect to /dashboard: PASS
- Anonymous redirect to /auth/login: PASS
- Console errors: NONE
- Failed application requests: NONE
- Unexpected behavior: NONE

The successful-create case intentionally mutated only the disposable local
database. Conflict and private-preview cases did not commit. Local smoke
fixtures remain until a later approved local reset. This evidence does not
authorize or substitute for staging inventory, backup, rehearsal, or migration
approval.
