# Active Context

Last updated: 2026-08-10

Current epic: workshop infrastructure integration and manifest-backed protected asset delivery.

Current task sequence:

1. Refresh compressed project-state workflow. Completed.
2. Design and implement minimal Supabase workshop manifest schema/RLS/audit contract. Completed locally and applied to linked staging after target confirmation.
3. Implement app-side protected asset auth/RPC/tests, point-cloud fallback, asset URL helper, and NGINX handoff docs. Completed through commit `e30d8d96`.
4. Migrate `AH-026005` DNG zoom levels `11`-`23` into MinIO bucket alias `tiles` and activate tile manifest. Completed.
5. Write protected asset rollback runbook and validation baseline. Completed in docs.
6. Confirm authenticated NGINX login, direct pilot tile URLs, and orthomap tile rendering. User-confirmed.
7. Fix orthomap tile-folder mismatch. Completed locally; orthomap now uses `survey.ortho?.tile_folder ?? "round-corners"`.
8. Add point-cloud manifest coverage. Completed in linked staging: `manifest-2026-08-10` approved/active includes `point_cloud` entry for `pointclouds/dng/2026/AH-026005/point-clouds/odm.pcd`.
9. Set `PROTECTED_ASSET_STORAGE_POINTCLOUDS_ROOT=pointclouds`, restart Next, and rerun authenticated point-cloud smoke tests. Completed; user confirmed the 3D tab loads the protected ODM point cloud.
10. Verify fail-closed and malformed-route behavior. Completed; anonymous point-cloud route returns `401`, and `//asimov-hawks/3d/...` is rejected as `malformed_request`.
11. Commit, push, and merge the verified protected-asset follow-up into `development`. Completed: feature commit `57b6b378`, remote `development` advanced to merge commit `6be83d42`.
12. Record the workshop smoke baseline. Completed in `docs/validation-baseline-2026-08-10.md`.
13. Repair the lint config baseline. Completed: `eslint.config.mjs` now uses `prefer-const`, and `npm run lint` reaches real project findings.
14. Clear the current lint errors and complete a first warning cleanup pass. Completed; `npm run lint` now exits cleanly with warnings only.

Current validation results:

- Local Supabase reset/lint/pgTAP previously passed after protected asset RPC: 4 files, 66 tests.
- Linked staging migrations through `20260804004000` are applied; linked schema lint reports no errors.
- `manifest-2026-08-10` is approved/active; `manifest-2026-08-07` is superseded/inactive.
- User-confirmed authenticated NGINX login, direct z11/z23 tile URLs, orthomap tile rendering, and 3D tab point-cloud loading work.
- Anonymous shell checks return `401` for protected z11 tile and point-cloud route.
- Malformed double-slash protected point-cloud route requests are denied before upstream access.
- Workshop smoke baseline is documented for login, orthomap, 3D, and fail-closed flows.
- `npm run lint` now passes with warnings only.
- `npx tsc --noEmit` and `npm run build` remain known non-green baseline checks.

Key constraints:

- Do not apply additional Supabase migrations remotely before target confirmation.
- Keep real manifests private; do not commit personal data, secrets, private hostnames, raw storage credentials, or full operational details.
- Preserve `/asimov-hawks`, `/asimov-hawks/tiles`, and `/asimov-hawks/3d` browser-facing paths for the protected asset transition.
- Keep detections server-side through Supabase Storage for v1.
- NGINX, not Next middleware, is the protected GIS asset boundary.

Next recommended task:

- Decide whether to continue burning down warning-only lint debt or switch to the TypeScript baseline.
