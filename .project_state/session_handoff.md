# Session Handoff

Last updated: 2026-08-10

Protected asset app-side implementation is in place on `feature/workshop-manifest-gate`. Recent committed slices are `5e0e4dea` for app auth/RPC/tests, `284751de` for point-cloud fallback, `e30d8d96` for asset URL helper plus NGINX handoff and smoke-test docs, and `d3daf0cd` for refreshed protected-asset docs/state.

Current active staging manifest is `manifest-2026-08-10`. It supersedes `manifest-2026-08-07`, which is now superseded/inactive. Active entries include the existing `AH-026005` DNG round-corners `tile_group` in bucket alias `tiles` and a new ODM `point_cloud` entry in bucket alias `pointclouds` at `dng/2026/AH-026005/point-clouds/odm.pcd`.

User-confirmed smoke status: NGINX app access works after initial Next compile warmup. Login at `http://localhost:8080/asimov-hawks/auth/login` works, authenticated direct z11/z23 protected tile URLs worked, the orthomap renders tiles after the local tile-folder fix, and the survey 3D tab loads the protected ODM point cloud.

Current local code fixes: `components/maps/ortho-map.tsx` uses `survey.ortho?.tile_folder ?? "round-corners"` in both raster URL builders instead of hardcoded `sharp-corners`, and `components/threejs/3d-model.tsx` uses Drei `<Html>` for point-cloud fallback messages rendered inside `<Canvas>`.

Point-cloud manifest status: linked staging supersession succeeded; verification query shows `manifest-2026-08-10` approved/active with both `tile_group` and `point_cloud` entries. Anonymous NGINX `HEAD` to `/asimov-hawks/3d/dng/2026/AH-026005/odm.pcd` returns `401`, preserving fail-closed behavior, and malformed double-slash requests such as `//asimov-hawks/3d/...` are denied as `malformed_request`.

Next task: commit and push the verified orthomap/point-cloud follow-up, then record a short workshop smoke baseline covering login, orthomap, point cloud, and anonymous fail-closed behavior.
