# Active Context

Last updated: 2026-08-11

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
15. Clear the current TypeScript baseline. Completed; `npx tsc --noEmit` now passes.
16. Define controlled MinIO migration-wave plan. Completed in `docs/workshop-asset-migration-wave-plan.md`.
17. Prepare the first concrete Wave 1 asset set. Completed in `docs/workshop-wave1-staging-prep-2026-08-10.md`.
18. Build config-driven protected asset publisher automation. Completed locally in `scripts/publish-protected-assets.js` with example config `scripts/minio-publish-jobs.example.json`.
19. Publish and smoke `barbco2026/AH-0260001`. Completed: user confirmed protected tiles and 3D point cloud render through NGINX after manifest pattern/object-path fixes.
20. Update protected asset publisher for manifest/ortho tile-folder alignment. Completed locally: dry-run reports now include `tileFolderExpectations`, `orthoTileFolderAuditSql`, and combined `sqlEditorReviewSql`.
21. Complete `AH-026005` DNG control sample, including zoom `24`. Completed: user confirmed the final DNG upload succeeded.
22. Smoke current Barbco protected datasets. Completed: user confirmed Barbco datasets display their protected tiles and 3D assets correctly after manifest/tile-folder alignment fixes.

Current validation results:

- Local Supabase reset/lint/pgTAP previously passed after protected asset RPC: 4 files, 66 tests.
- Linked staging migrations through `20260804004000` are applied; linked schema lint reports no errors.
- `manifest-2026-08-11` is approved/active; `manifest-2026-08-10` is superseded/inactive.
- User-confirmed authenticated NGINX login, direct z11/z23 tile URLs, orthomap tile rendering, and 3D tab point-cloud loading work.
- Anonymous shell checks return `401` for protected z11 tile and point-cloud route.
- Malformed double-slash protected point-cloud route requests are denied before upstream access.
- Workshop smoke baseline is documented for login, orthomap, 3D, and fail-closed flows.
- `npm run lint` now passes with warnings only.
- `npx tsc --noEmit` now passes.
- `npm run build` remains the known non-green baseline check.
- Build interpretation is constrained: workshop GIS assets belong behind NGINX/MinIO, so a meaningful build baseline should use a dataset-light app context instead of local `public/tiles` and `public/3d`.
- Controlled MinIO migration expansion is planned as small workshop-candidate waves, not full-history migration.
- `AH-026005` DNG protected asset migration is complete, including the formerly remaining `round-corners/24` tile prefix.
- Manual `AH-026005` zoom-24 upload crashed MinIO when attempted as one large paste; staged/batched upload completed successfully.
- `barbco2026/AH-0260001` protected tiles and ODM point cloud now render through NGINX. The manifest fix was to replace `*` tile route patterns with `{z}/{x}/{y}.png`, set `destination_prefix_alias = null`, and put the MinIO prefix/object key in `metadata.object_path`.
- `AH-0260002` rendered after its manifest used `sharp-corners`; `AH-0260001`/`AH-0260003` showed why client-side folder guessing is unsafe under protected auth. Migration reports must align `orthos.tile_folder` with the approved tile route before smoke testing.

Key constraints:

- Do not apply additional Supabase migrations remotely before target confirmation.
- Keep real manifests private; do not commit personal data, secrets, private hostnames, raw storage credentials, or full operational details.
- Preserve `/asimov-hawks`, `/asimov-hawks/tiles`, and `/asimov-hawks/3d` browser-facing paths for the protected asset transition.
- Keep detections server-side through Supabase Storage for v1.
- NGINX, not Next middleware, is the protected GIS asset boundary.

Next recommended task:

- Push and merge the state/publisher refresh, then review the app/Supabase admin-panel workflow and define the minimum workshop-ready admin behaviors.
