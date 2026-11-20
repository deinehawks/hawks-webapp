# Backlog
Last updated: 2026-11-20.

Current V2 MinIO integration gates:
- Completed: rebase the focused MinIO port onto remote `integration/v2-latest`
  at `a9ada054`; reconciled commit `6d7c82b8`, recovery ref preserved.
- Completed: PowerShell/JSON parsing, recording 32/32, workshop/UI 124/124,
  whitespace and production build. TypeScript/lint match the legacy baseline.
- Pending: commit state evidence, push `integration/v2-minio`, merge it into
  `integration/v2-latest`, validate the exact result and push the new baseline.
- Do not run `npm run minio-storage:start` or alter Docker, storage, assets,
  Supabase, V3, or production as part of source integration.

Dynamic V3-backed discovery is locally complete. Pending: wait for the separate
V3 migration review/rehearsal/staging approval, then restart V2 and smoke an
ordinary member, platform admin, empty scope, cross-scope denial, tiles, and an
available PCD. Do not add surveys to the V2 selection/catalog; publish verified
current outputs in V3 after rollout. Recording tests pass 30/30.

Completed preparation:
- Independent sparse V2 checkout and branch; no working-tree GIS copies.
- Ignored staging anonymous configuration and exact 58-survey selection.
- Recording data/auth/asset adapters, exact output bindings, checklist,
  missing-data guards and tests.
- No live infrastructure, staging record, or V3 checkout changes.
- All 21 wave reports audited; exact 58-survey catalog generated.
- Own dependencies installed; route type generation, 29 focused tests and build
  pass (build retains old type/lint bypasses).
- Read-only staging inventory completed; missing metadata remains explicit.
- Active ordinary-member auth, RLS-filtered loaders, original Areas navigation,
  admin-only checklist, unauthorized-route 404 and no-3D fallback.

Historical pre-dynamic checklist (superseded for runtime selection):
1. Manage account membership and survey grants in V3; V2 must not add a local
   client/survey filter.
2. After the V3 publishing migration is live, sign in through port 8082 and
   verify the authorized published outputs plus cross-scope denial.
3. Classify the remaining legacy TypeScript errors and invalid ESLint rule only
   if time remains; no new errors were observed today.
4. Verify the selected recording views and record the clips.

The recording viewer now admits PCDs up to 5 GiB. Test large files individually
on the recording machine; browser parsing, memory and GPU limits can still fail
below that application gate.
