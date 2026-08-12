# Backlog

Last updated: 2026-08-12

## P1

- Smoke the new platform-admin survey-grant workflow and use it for individual-farmer access cases such as `dagaang.viz.hawks@gmail.com` after the correct legacy client/person mapping is confirmed.
- Plan a separate `public.app_role` enum rebuild to remove historical enum labels (`org_admin`, `editor`, `viewer`) after dependency inspection; the current check constraint already blocks those values in `profiles.role`.
- Prove post-drop parity after the local/staging `profiles.account_role` and `profiles.organization_id` removal slice, especially across protected-asset access, admin reads, and direct pgTAP/RLS checks.
- Decide whether compatibility stubs such as `app_private.current_organization_id()` should remain temporarily for historical reset safety or be trimmed in a final cleanup pass before production rollout.
- Apply the corrected manifest-entry shape and generated `orthos.tile_folder` audit/update SQL to each workshop migration candidate before smoke testing.
- Extend protected-asset smoke coverage beyond the current approved control samples.

## P2

- Investigate `npm run build` heap exhaustion and document the accepted build command or memory setting.
- Containerize Next.js with standalone output and a `.dockerignore` excluding secrets, GIS assets, local backups, and generated datasets.
- Finalize authorized Cloudflare caching design for protected assets beyond v1.

## P3

- Full historical dataset migration.
- Broaden publisher automation with more manifest-prep and resumable verification helpers.
- Broad infrastructure automation and Kubernetes.
- Advanced analytics, DAM, destructive workflows, and large asset reorganization.
- General multi-organization account access.
