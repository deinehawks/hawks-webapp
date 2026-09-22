# Survey Identity And Client-Field Contract

Status: first compatibility-safe contraction stage implemented locally on
`feature/survey-contract` and applied to non-production staging on
2026-08-25. The matching application change is integrated into
`development`; staging deployment confirmation and signed-in UI smoke remain
pending. Production is unchanged.

## Field Contract

The current `surveys` record combines stable dataset identity, legacy routing
compatibility, editable descriptive metadata, and operational geospatial or
output state.

| Classification | Fields | Contract |
| --- | --- | --- |
| Immutable identity | `id`, `code` | Preserve. These values participate in routes, map labels, asset lookup, and legacy dataset naming. |
| Retained client compatibility | `client_id`, `access_code`, `organization_code` | Preserve and expose read-only. `client_id` remains a dataset relationship and never grants profile access by itself. |
| Platform-admin editable metadata | `status`, `location`, `flight_date`, `area`, `area_code`, `type`, `category` | Update only through `platform_admin_update_survey`. |
| Operational geospatial/output state | Boundary, coordinate, tile-bound, `ortho`, `point_cloud`, `tags`, and `created_by` fields | Keep outside the admin metadata workflow. Existing approved operational processes remain responsible for these values. |

Organization admins retain read-only survey visibility. Ordinary user access
continues to derive from active memberships, confirmed canonical relationships,
and explicit grants under RLS and server-side authorization.

## First-Stage Implementation

- The platform-admin survey page displays identity and compatibility values as
  locked context and submits only the editable metadata fields.
- Direct `authenticated` updates to `public.surveys` are revoked. The narrow
  security-definer RPC authenticates the actor as a platform admin, validates
  area values, updates only approved metadata, and remains covered by the
  existing survey audit trigger.
- Service-role operational scripts remain separate and retain their privileged
  path. No service-role credential is added to application runtime code.
- No column, relationship, route, storage key, or asset path is removed or
  renamed. `supabase/deferred/contract_uuid_tenant_keys.sql` remains deferred
  and must not be applied unchanged.

## Inventory And Rollout Gate

Run `supabase/verification/inventory_survey_contract.sql` read-only against the
target project. It reports aggregate nulls, compatibility mismatches, duplicate
codes, output-pointer mismatches, and update-contract permissions without
emitting identifiers or asset paths.

The read-only staging inventory completed on 2026-08-25 against
`llealjcaqvltrtdwwzrh`:

- 108 surveys; no null `code`, `access_code`, or `client_id` values.
- No missing client references and no code/access-code or populated
  organization-code mismatches.
- 107 null `organization_code` values and nine duplicated non-null survey-code
  groups. The contract therefore keeps both fields nullable/non-unique and
  read-only.
- No current ortho or point-cloud pointer mismatches.
- Expected pre-migration state: the RPC is absent and `authenticated` retains
  direct survey update privilege. The migration replaces that broad update path
  with the narrow RPC.

The checksummed backup/restore, exact migration and containment rehearsal,
one-file dry-run, staging apply, contract/history verification, linked type
generation, automated suite, and rolled-back database-role authorization smoke
passed. See
`docs/survey-contract-staging-validation-2026-08-25.md` for evidence.

The remaining staging item is deployment confirmation followed by a signed-in
application UI click-through. Production rollout is a separate approval.
