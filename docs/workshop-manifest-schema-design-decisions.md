# Workshop Manifest Schema Design Decisions

Last updated: 2026-08-04

This document closes the open questions from `docs/workshop-manifest-schema-design.md`.

## 1. Storage References

Decision:

- Store opaque storage aliases in manifest records.
- Resolve aliases to real MinIO bucket names and object prefixes in the storage layer.

Rationale:

- Keeps the real manifest safer to read and export.
- Avoids coupling application and manifest records to physical MinIO layout.
- Allows bucket/prefix changes without rewriting approved manifest meaning.
- Reduces risk of leaking private bucket names or operational paths.

Implementation interpretation:

- `destination_bucket` should contain an alias, not a raw private bucket name.
- `destination_prefix` should contain an alias or logical prefix, not necessarily the exact MinIO object prefix.
- The storage delivery layer or migration tooling owns alias resolution.
- Alias resolution must be deterministic and documented outside public Git when it exposes private infrastructure details.

## 2. Approver Enforcement

Decision:

- Check the approver by email: `visualization.hawks@gmail.com`.

Rationale:

- The project lead account is known by email.
- This avoids hard-coding a UUID before the target Supabase project is inspected.

Implementation interpretation:

- Approval logic should resolve `approved_by` to a `profiles.id`.
- The trigger or server action should verify that the resolved profile email equals `visualization.hawks@gmail.com`.
- If the email is missing or duplicated, approval must fail closed until the profile state is corrected.

## 3. Approved Manifest Immutability

Decision:

- Approved manifest rows are immutable records.
- Emergency fixes should use supersession rather than direct modification or deletion.
- Service-role administrators may create a replacement manifest version that supersedes the previous approved record.
- The original approved record must remain preserved for auditability and traceability.

Deletion rule:

- Physical deletion is limited to non-production/test data or exceptional database maintenance operations outside normal application workflows.

Implementation interpretation:

- Normal authenticated app workflows must not update or delete approved or superseded manifests.
- Approved manifests should be corrected by creating a new manifest version with `supersedes_manifest_id`.
- The previous approved manifest can move to `superseded`, but its content should remain unchanged.
- Service-role maintenance should not be part of the application workflow and should require backup/audit discipline.

## Migration-Drafting Readiness

The manifest schema design is ready to become a draft migration after incorporating these decisions:

- use opaque storage aliases;
- enforce approval by `visualization.hawks@gmail.com`;
- preserve approved manifests through supersession;
- keep physical deletion outside normal production workflows.
