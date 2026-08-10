# Context Optimization Report

Last updated: 2026-08-03

## Repository Structure Findings

- Agent guidance: root `AGENTS.md`.
- Planning documents: `docs/admin-dashboard-integration-plan.md`, `docs/admin-dashboard-phase-2-discovery.md`, `docs/supabase-migration-runbook.md`.
- Architecture/deployment source: `docs/ASIMOV-HAWKS_Web_App_Deployment_Plan_Final.docx`.
- Manifest gate documents: `docs/workshop-manifest-template.md`, `docs/workshop-manifest.example.json`.
- Test evidence: `supabase/tests/authorization.sql`, `supabase/tests/domain_authorization.sql`, `supabase/verification/verify_expand.sql`, `supabase/verification/verify_domain_expand.sql`.
- Backlog/status/ADR equivalents were previously embedded in long planning docs and `AGENTS.md`; they are now compressed into `.project_state/`.

## Frequently Loaded But Rarely Needed

- `docs/admin-dashboard-phase-2-discovery.md`: useful historical evidence, but not a daily startup file.
- `docs/supabase-migration-runbook.md`: critical for database/storage work, but too detailed for UI or routine implementation tasks.
- `docs/ASIMOV-HAWKS_Web_App_Deployment_Plan_Final.docx`: source provenance for deployment direction; load only for traceability.
- Full `docs/admin-dashboard-integration-plan.md`: use targeted headings instead of whole-file reads.

## Recommendations

- Archive candidate: none yet. Keep all current docs because they encode review history and deployment gates.
- Merge candidate: none yet. The docs cover distinct concerns.
- Summary candidates: maintain `.project_state/architecture_summary.md`, `.project_state/current_state.md`, `.project_state/decisions.md`, and `.project_state/project_index.md` as summaries of the long docs.
- Daily startup should read four small state files only.
- Weekly review may refresh state files from selected sections of long docs and recent git history.

## Estimated Context Reduction

Previous startup pattern could load root `AGENTS.md` plus all planning docs, likely tens of thousands of words. The new startup packet is four concise state files, roughly 1,000-1,500 words total, with deeper docs loaded only on demand.
