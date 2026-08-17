# Session Handoff

Last updated: 2026-08-17

The dedicated admin wave now includes account list/detail, read-only effective-access preview, survey/farm grant controls, membership controls, resource lists, Organization Operations v1, Farm Operations v1, Survey Operations v1, and Output Operations v1. `/admin/outputs/new` registers draft catalog records; `/admin/outputs/[id]` edits safe metadata, manages `draft -> ready -> approved -> archived` readiness transitions, and atomically selects one current ready/approved output per survey/type. Storage references are display-only, while publishing, asset relocation, metadata JSON editing, and deletion remain deferred. Output and access-grant survey selectors now show short survey ID plus available code/client/date context to avoid duplicate labels.

Controlled mutations now also include draft output registration, safe output metadata edits, readiness transitions, and atomic current-output selection. The database rejects skipped transitions, readiness without storage references, non-eligible current outputs, and all mutations to published/archived outputs. Actions re-authenticate the actor, require `platform_admin`, rely on RLS, and use existing output audit triggers. No code path changes `profiles.role`; account roles remain only `platform_admin | user`, while `org_admin | editor | viewer` belong to memberships.

Validation:

- TypeScript passes.
- Targeted lint passes with no findings; repository-wide lint still fails on the pre-existing `components/maplibre.tsx` ban-ts-comment error.
- Focused domain pgTAP passes 43/43.
- Full pgTAP suite passes 91 tests across 5 files.
- User smoke confirmed platform-admin access and normal-user denial for `/admin` before this slice.
- Local schema lint still reports the pre-existing stale `app_private.backfill_legacy_organization_memberships` reference to removed `profiles.organization_id`; the output migration itself passes reset and pgTAP.
- Authenticated visual smoke for `/admin/access-preview/[profileId]`, farm-grant controls, and `/admin/[resource]` list routes remains manual.

Next task: smoke Output Operations v1, then continue the approved workshop asset migration/readiness work. Output publication remains separately gated.

Do not touch unrelated scratch work in `.tmp/`, `issues.txt`, `workflow.txt`, or the user-owned deletion of `improve.txt`.