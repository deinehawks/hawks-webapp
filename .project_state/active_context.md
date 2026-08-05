# Active Context

Last updated: 2026-08-05

Current epic: workshop infrastructure integration and manifest-backed protected asset delivery.

Current task sequence:

1. Refresh active compressed state files. Completed.
2. Design minimal Supabase manifest schema/RLS/audit contract. Completed.
3. Close schema design questions. Completed.
4. Draft Supabase manifest migration/RLS/audit SQL. Completed locally.
5. Design protected asset delivery implementation. Completed as design.
6. Review pass corrections. Completed locally.
7. Local Supabase apply/test pass. Completed and green.
8. Fix existing domain authorization baseline. Completed.
9. Commit manifest gate and protected asset planning baseline. Completed as `aa9f81d3`.
10. Draft protected asset implementation plan. Completed in `docs/protected-asset-implementation-plan.md`.

Local validation results:

- `npx supabase db reset --local`: passed; all migrations applied.
- `verify_workshop_manifest_gate.sql`: passed via psql in local DB container.
- `verify_workshop_manifest_review_fixes.sql`: passed via psql in local DB container.
- `supabase/tests/workshop_manifest_gate.sql`: passed, 12 tests.
- `supabase/tests/authorization.sql`: passed, 13 tests.
- `supabase/tests/domain_authorization.sql`: corrected and passed, 34 tests.
- Full `npx supabase test db --local`: passed, 4 files, 66 tests.
- `npx supabase db lint --local --level warning`: passed with no schema errors.

Key constraints:

- Do not apply Supabase migrations remotely before target confirmation.
- Keep real manifest private; do not commit personal data, secrets, private hostnames, raw storage credentials, or full operational details.
- Preserve current `/asimov-hawks`, `/asimov-hawks/tiles`, and `/asimov-hawks/3d` browser-facing paths in Phase 1.
- Keep detections server-side through Supabase Storage for v1.
- NGINX, not Next middleware, is the protected GIS asset boundary.

Next recommended task:

- Review the external NGINX handoff checklist, local smoke-test runbook, and Phase 2 asset URL helper slice; external WSL NGINX anonymous auth-boundary smoke tests now pass, and legacy 2024 public tiles load through a local/dev-only bypass. Next: commit the asset-helper/docs/milestone slice, then plan MinIO migration for approved workshop assets.