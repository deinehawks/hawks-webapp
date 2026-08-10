# Active Context

Last updated: 2026-08-10

Current epic: workshop infrastructure integration and manifest-backed protected asset delivery.

Current task sequence:

1. Refresh compressed project-state workflow. Completed.
2. Design and implement minimal Supabase workshop manifest schema/RLS/audit contract. Completed locally and applied to linked staging after target confirmation.
3. Implement app-side protected asset auth/RPC/tests, point-cloud fallback, asset URL helper, and NGINX handoff docs. Completed through commit `e30d8d96`.
4. Migrate `AH-026005` DNG zoom levels `11`-`23` into MinIO bucket alias `tiles` and activate `manifest-2026-08-07`. Completed.
5. Write protected asset rollback runbook. Completed in `docs/protected-asset-rollback-runbook.md`.
6. Refresh validation baseline. Completed in `docs/validation-baseline-2026-08-10.md`; app checks remain non-green.
7. Run authenticated protected tile smoke tests. Blocked by local Next dev route timeouts.

Current validation results:

- Local Supabase reset/lint/pgTAP previously passed after protected asset RPC: 4 files, 66 tests.
- Linked staging migrations through `20260804004000` are applied; linked schema lint reports no errors.
- MinIO `tiles` pilot copy is verified for `AH-026005`: `42,547` objects / `2.8GiB`.
- `npm run lint` fails on the documented `prefer const` plugin config issue.
- `npx tsc --noEmit` fails on existing application TypeScript baseline files; protected-asset helper files are not listed.
- `npm run build` fails with the known Node heap limit.
- Protected z11/z23 tile smoke tests timed out because local Next dev did not respond to app, NGINX, or asset-auth probes.

Key constraints:

- Do not apply additional Supabase migrations remotely before target confirmation.
- Keep real manifests private; do not commit personal data, secrets, private hostnames, raw storage credentials, or full operational details.
- Preserve `/asimov-hawks`, `/asimov-hawks/tiles`, and `/asimov-hawks/3d` browser-facing paths for the protected asset transition.
- Keep detections server-side through Supabase Storage for v1.
- NGINX, not Next middleware, is the protected GIS asset boundary.

Next recommended task:

- Diagnose the local Next dev timeout while compiling/serving `/` and `/internal/asset-auth`, then rerun authenticated NGINX/browser smoke tests for the `AH-026005` z11 and z23 sample tiles from `manifest-2026-08-07`.
