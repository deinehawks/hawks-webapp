# Manifest Schema Design State

Last updated: 2026-08-04

Primary reference: `docs/workshop-manifest-schema-design.md`.

Design drafted:

- `workshop_manifests`
- `workshop_manifest_entries`
- audit through existing `admin_audit_log`
- platform-admin-only RLS via `app_private.domain_is_platform_admin()`
- approval tied to `visualization.hawks@gmail.com`
- approved/superseded manifest immutability
- manifest supersession instead of approved-record mutation
- tile groups/prefixes instead of individual tile files
- lightweight verification JSON for object counts, byte totals, zoom range, sample tile checks, and map smoke tests
- private MinIO backup metadata fields

Next review needed:

- decide whether private bucket/prefix fields should use real internal names or opaque aliases;
- decide whether approval should check email or a concrete profile ID after local database inspection;
- decide whether service-role emergency cleanup remains allowed.
