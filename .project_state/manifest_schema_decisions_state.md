# Manifest Schema Decisions State

Last updated: 2026-08-04

Primary reference: `docs/workshop-manifest-schema-design-decisions.md`.

Closed schema decisions:

- Manifest storage fields should use opaque aliases.
- Real MinIO bucket names and object prefixes are resolved in the storage layer, not exposed directly in manifest records.
- Manifest approval is checked by email: `visualization.hawks@gmail.com`.
- Approval still stores a resolved `profiles.id` in `approved_by`.
- Missing or duplicated approver email must fail closed.
- Approved manifest rows are immutable.
- Emergency fixes use supersession by creating a replacement manifest version.
- Original approved records remain preserved for auditability and traceability.
- Physical deletion is limited to non-production/test data or exceptional database maintenance outside normal app workflows.

Manifest schema design is ready for draft migration planning.
