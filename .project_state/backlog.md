# Backlog
Last updated: 2026-10-27.

Current V2 consolidation gates:
- Commit the restored grant-only presentation-client fallback and state update
  after focused review.
- Completed: regenerated Next route types and passed the production build.
  Standalone TypeScript and lint retain the documented legacy V2 failures.
- Smoke the current branch at `127.0.0.1:3200` for login, responsive dashboard,
  multi-client navigation, survey table, Orthomap, authorized point cloud,
  empty scope and cross-scope denial.
- Completed the anonymous subset: login/root return 200 and dashboard redirects
  to login. Authenticated and real-asset checks remain pending.
- Keep `development`, `main`, staging, assets, services and remotes unchanged;
  push only after explicit approval.

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
