# Org-admin Farm and Survey Tables Smoke - 2026-09-14

## Scope

- Branch: `feature/org-admin-tables`
- Base: `development` at `b35c50f5`
- Routes:
  - `/org-admin/farms`
  - `/org-admin/farms/[farmId]`
  - `/org-admin/surveys`
- This slice changes application presentation and routing only. It adds no
  database migration, RPC, RLS policy, or authorization bypass.

## Automated verification

- Next route type generation: PASS
- TypeScript: PASS
- Targeted ESLint for all three affected route files: PASS
- Whole-diff whitespace check: PASS
- Anonymous NGINX checks for all three routes redirected to
  `/asimov-hawks/auth/login`: PASS

## User-assisted authenticated UI smoke

The user reported that the complete requested smoke checklist passed:

- Farm creation remained available.
- The confirmed-farm table rendered correctly.
- Edit opened the correct scoped farm detail route.
- Farm changes saved and persisted, with test values restored.
- Cross-organization farm access failed closed.
- The confirmed-survey table rendered correctly.
- View Data opened the correct authorized survey through the existing dashboard
  survey route.
- Unauthorized survey access remained denied.
- Farm and survey tables remained usable at narrow/mobile width.
- Ordinary-user, platform-admin, and anonymous route boundaries remained
  correct.
- Browser console errors: NONE
- Failed application requests: NONE
- Unexpected behavior: NONE

## Result

The feature is ready for focused diff review, commit, push, and pull-request
integration into `development`.
