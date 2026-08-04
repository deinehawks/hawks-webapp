# Project Index

Last updated: 2026-08-03

Use this file to choose context without loading all docs.

## Startup State

- `.project_state/current_state.md`: latest implementation status, blockers, and priority.
- `.project_state/active_context.md`: current epic/task and relevant files.
- `.project_state/backlog.md`: compressed prioritized queue.
- `.project_state/session_handoff.md`: latest handoff and next task.
- `.project_state/decisions.md`: compressed ADR-style decision summary.
- `.project_state/architecture_summary.md`: compact architecture overview.

## Planning Docs

- `docs/admin-dashboard-integration-plan.md`: primary long-form admin, domain, deployment, risk, acceptance, and phase plan. Load targeted sections only.
- `docs/admin-dashboard-phase-2-discovery.md`: historical read-only discovery of main app, staging metadata, and intern dashboard. Use for provenance, not current status.
- `docs/supabase-migration-runbook.md`: database/domain/storage/contract migration gates, rehearsal, checks, and recovery.
- `docs/workshop-manifest-template.md`: human-readable sanitized manifest checklist.
- `docs/workshop-manifest.example.json`: machine-readable sanitized manifest example.
- `docs/ASIMOV-HAWKS_Web_App_Deployment_Plan_Final.docx`: owner-supplied source deployment plan. Load only for deployment-plan traceability.

## Code Locations

- `app/`: routes and server-first pages.
- `components/`: UI, map, admin, and visualization components.
- `lib/actions/`: protected server actions.
- `lib/auth/user-context.ts`: centralized tenant/user context and access checks.
- `utils/supabase/`: Supabase client factories and middleware session handling.
- `stores/` and `providers/`: map and view state.
- `supabase/migrations/`: authoritative checked-in schema/policy changes.
- `supabase/tests/`: pgTAP authorization tests.
- `supabase/verification/`: SQL verification scripts.
- `scripts/`: operational scripts; treat service-role or mutation scripts as approval-gated.

## Validation Commands

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- Supabase validation only when local Supabase is intentionally started and target is confirmed.
