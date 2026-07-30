# Workshop Dataset Manifest Gate

Status: Template only. Do not treat this file as an approved workshop manifest.

This gate defines the minimum information required before any ASIMOV-HAWKS workshop dataset, map, tile folder, point cloud, detected-object file, output, report, or account access is migrated or exposed through the limited public-internet workshop deployment.

The populated manifest should be reviewed outside Git if it contains names, emails, phone numbers, client-private identifiers, exact asset locations, or other sensitive operational details. Checked-in manifests must remain sanitized and must not include secrets, service-role values, passwords, private hostnames, personal contact data, or full historical dataset listings.

## Purpose

The workshop manifest is the allowlist for September 28-30, 2026 deployment scope. If an account, organization, client, survey, asset, output, or route is not listed in the approved manifest, it does not move before the workshop.

The manifest must preserve backward compatibility with existing users, clients, surveys, maps, orthophotos, 3D point clouds, detections, tile paths, storage references, dashboard routes, and RLS behavior while only enabling the selected invited cohort.

## Required Approval State

A manifest can move through these states:

- `draft`: information is being gathered and may be incomplete.
- `reviewed`: technical owner has checked shape, references, access scope, and rollback fields.
- `approved`: product owner, technical owner, database owner, and deployment owner agree this is the workshop allowlist.
- `superseded`: replaced by a newer approved manifest version.

Only an `approved` manifest may be used for migration tooling, protected asset-origin preparation, or public-internet deployment checks.

## Required Sections

### 1. Manifest Metadata

Record:

- manifest ID and version
- status
- prepared date
- target environment, normally staging first
- deployment target window
- stabilization and handoff window
- final completion deadline
- approval roles, not personal secrets
- rollback authority role

### 2. Invited Access Scope

Record only the minimum needed identifiers:

- invited account reference, preferably `profiles.id` or a secure external roster reference
- intended global account role
- organization membership role and status
- organization ID or approved organization reference
- survey-grant requirements, if access is outside normal organization membership
- exclusion notes for users who should not receive workshop access

Do not copy Supabase Auth users from another project. Do not include passwords, OTPs, refresh tokens, or service-role credentials.

### 3. Organization And Legacy Client Scope

For each invited organization, cooperative, association, plantation/company, individual client, or mixed historical client record, record:

- canonical organization/person reference if already mapped
- legacy `clients.id` and `clients.code` compatibility reference when required by existing routes or asset paths
- organization type or unresolved classification state
- whether the record is included, excluded, or deferred
- reason for inclusion
- reviewer notes

Existing `clients` rows remain mixed historical tenant records during the expand phase. Do not classify every client as an organization, every farmer as a client, or every client as a farm.

### 4. Survey And Farm Scope

For each selected survey or mission, record:

- `surveys.id`
- compatible `surveys.client_id`
- display label or safe internal reference
- expected organization access path
- required explicit survey grants, if any
- expected `survey_farms` mappings or a documented `needs_review` state
- primary display farm, if one is approved for display
- legacy route compatibility requirements

A survey may span multiple farms. Do not add or rely on one canonical `surveys.farm_id` for workshop planning.

### 5. Asset And Output Scope

For each selected asset or output class, record:

- asset type: tiles, point cloud, detected objects, orthomosaic, report, generic output, or metadata
- source location reference
- intended destination bucket/origin/prefix reference
- stable public application URL or route pattern
- protected-delivery requirement
- object version
- expected file count
- expected total bytes
- checksum method and checksum-set reference
- rollback source
- owner/operator notes

Do not commit large generated assets, tile folders, point clouds, detection outputs, or full checksum files unless a separate asset-management plan approves it.

### 6. Authorization Scope

For every selected dataset, record how access is granted:

- platform-admin access
- active organization membership
- explicit farm grant, where farm-only metadata is intended
- explicit survey grant, where shared survey data and outputs are intended
- denied anonymous access
- denied removed/suspended membership access
- denied cross-organization access

Farm owner/operator/contact metadata does not grant application access by itself.

### 7. External Internet Test Scope

Record the exact external tests that must pass before invited users receive URLs:

- public application hostname resolves through Cloudflare
- HTTPS works through Cloudflare and NGINX
- login/logout/session refresh works
- platform admin can inspect selected records
- invited organization member can see only approved surveys and outputs
- anonymous users cannot access protected application routes or protected asset URLs
- non-invited or removed/suspended users cannot access selected assets
- maps, tiles, detections, point clouds, and outputs load within acceptable time
- rollback to previous app image and asset source is rehearsed

### 8. Rollback Fields

Each manifest batch must identify:

- previous app image or commit
- previous asset source/path/version
- database backup or restore point
- Cloudflare cache keys or URL patterns that may need invalidation
- NGINX route change to reverse
- person or role with rollback authority
- rollback trigger conditions

Rollback triggers include authorization leakage, manifest mismatch, checksum failure, broken maps/assets, unacceptable error rate or latency, failed backup/restore verification, and missing audit records for admin actions.

## Approval Checklist

Before migration or deployment work starts, confirm:

- [ ] Manifest status is `approved`.
- [ ] No secrets or unnecessary personal data are present in checked-in files.
- [ ] Every included user/account has an approved access path.
- [ ] Every included legacy client is classified or explicitly marked `needs_review`.
- [ ] Every included survey has an approved organization access path.
- [ ] Multi-farm surveys use `survey_farms` planning fields or a documented review exception.
- [ ] Every asset has source, destination, counts, bytes, checksum method, stable URL, and rollback source.
- [ ] Protected asset delivery design is approved before any cutover.
- [ ] Anonymous, removed/suspended, and cross-organization denial tests are defined.
- [ ] External internet test location and public hostname are recorded.
- [ ] Backup and rollback owners are recorded.
- [ ] Non-manifest data remains deferred.

## Related Files

- `docs/workshop-manifest.example.json`: sanitized machine-readable example shape.
- `docs/admin-dashboard-integration-plan.md`: overall Admin Dashboard and workshop rollout plan.
- `docs/supabase-migration-runbook.md`: database, storage, RLS, and asset migration gates.
- `AGENTS.md`: repository operating rules and deployment boundary.