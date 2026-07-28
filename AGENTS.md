# AGENTS.md

## Project overview

ASIMOV-HAWKS is a Next.js dashboard for authenticated users to inspect agricultural drone surveys. It lists survey areas, summarizes banana-plant detections, renders survey and organization-wide orthomosaics, and displays ODM/LiDAR point clouds. The checked-in compatible application uses UUID tenant relationships (`profiles.organization_id` and `surveys.client_id`) while retaining legacy code columns during the expand phase. Database roles and RLS exist for platform admins, organization admins, editors, and viewers, but the Admin Dashboard and member-management UI are not implemented.

Primary users and beneficiaries include individual banana farmers, plantation owners, cooperative and association members, organization representatives, and field personnel in Mindanao. A person, organization, farm/plantation area, mission/survey, output, and application account are distinct domain concepts even where the current schema does not yet model them separately. Treat accessibility, responsive behavior, constrained networks, memory use, and performance across phones, tablets/iPads, laptops, and desktops as product requirements.

Delivery targets are production deployment on September 28-30, 2026, followed by stabilization, documentation, and handoff on October 1-9, 2026. Final completion is due October 9, 2026. Protect the deadline by keeping the first release focused on the approved Admin Dashboard MVP and deferring infrastructure, DAM, destructive workflows, advanced analytics, and multi-organization access.

Keep this file practical. Put detailed investigation and one-off findings in a separate assessment or plan.

## Technology stack

- Next.js 15 App Router, React 19, TypeScript 5, and Node/npm (`package.json`, `package-lock.json`)
- Tailwind CSS 4 plus shadcn/ui "new-york" components and Radix primitives
- Supabase Auth, Postgres access, and Storage through `@supabase/ssr` and `@supabase/supabase-js`
- MapLibre GL through `@vis.gl/react-maplibre`; OpenStreetMap raster tiles and MapLibre demo glyphs
- Three.js, React Three Fiber, Drei, and `three-stdlib` for PCD point clouds
- Zustand for map UI state; survey mode is persisted to browser local storage
- TanStack Table, React Hook Form, Zod, date-fns, Framer Motion, and Lottie
- A legacy `vercel.json` is present, but the project has moved away from Vercel and has no Vercel environments. No current deployment pipeline is checked in.

## Repository structure

- `app/`: App Router layouts, pages, loading/error states, and the email OTP route handler
- `components/`: feature components; `maps/` contains large MapLibre views, `callers/` dynamically loads browser-only visualization code, `threejs/` loads point clouds, and `ui/` contains shadcn/Radix primitives
- `lib/actions/`: server actions for auth, profiles, clients, surveys, and detected-object downloads
- `lib/constants/`, `lib/helpers/`, `lib/types.ts`: map configuration, GeoJSON/date helpers, and shared domain types
- `providers/` and `stores/`: per-view Zustand stores/providers and persisted survey-mode state
- `data/`: static selector/card metadata, not authoritative database data
- `utils/supabase/`: browser, server, and middleware Supabase client factories
- `scripts/update-tile-bounds.js`: privileged local-tile scan and Supabase update script
- `public/tiles/` and `public/3d/`: ignored, potentially very large runtime assets
- `public/hawks/` and top-level JSON/SVG files: tracked branding and loading assets

The repository includes a reconstructed Supabase baseline, additive UUID tenant migrations, hardened authorization policies, deferred contract/storage SQL, verification SQL, pgTAP authorization tests, and generated database types under `supabase/` and `lib/database.types.ts`. These files describe intended and previously inspected staging state, but repository evidence alone does not prove the current state of any remote staging or production project. There is still no GitHub Actions workflow or general application test suite.

## Architecture and data flow

1. `middleware.ts` calls `updateSession()` for matched routes. The Supabase middleware client refreshes auth cookies and redirects unauthenticated non-auth routes to `/auth/login`.
2. Server layouts/pages create a cookie-backed Supabase client and call server actions. Do not move privileged data reads into browser components.
3. `getCurrentUserProfile()` loads `profiles` with its related `clients` row through `profiles.organization_id`. Non-platform survey queries explicitly filter or check `surveys.client_id` in addition to RLS.
4. Survey records include boundary/coordinate metadata and current related `orthos`/`point_clouds` records through `survey_id`. Detection objects are downloaded server-side from `detected-objects` using `<client-uuid>/detections.json`, with a temporary `<client-code-lowercase>.json` compatibility fallback.
5. Server pages pass plain data to dynamically imported client maps. Map components build GeoJSON in memory, load external OSM basemaps, and request local raster tiles under `/asimov-hawks/tiles/...`.
6. Point-cloud views request `/asimov-hawks/3d/<code>/<year>/<survey-id>/odm.pcd` or `lidar.pcd`.
7. Zustand providers isolate map state per page. `stores/survey-mode-store.ts` persists only the analysis/inventory preference to local storage.

The application has `basePath: "/asimov-hawks"`. Preserve base-path behavior in routes and asset URLs. There are no general `/api` routes in the current tree; `app/auth/confirm/route.ts` is the only route handler.

## Domain-model gate

Treat these as separate concepts in planning, schema, authorization, and UI:

- `profiles`: authenticated application accounts and preferences.
- People/farmers/contacts: real individuals who may or may not have an account; no separate table exists yet.
- `clients`: mixed historical tenant records that may represent organizations or individuals; preserve them and map reviewed records to future canonical people or organizations.
- Organization membership access: one active organization per normal account in the first release; no table exists yet.
- Farms/plantation areas: monitored land or production areas; no table or survey foreign key exists yet.
- `surveys`: the current combined mission/survey record; future `survey_farms` must support multiple farms per survey.
- `orthos` and `point_clouds`: specialized survey outputs; other outputs and reports need a future relational catalog.

Future account roles separate global `platform_admin`/`individual` state from organization-scoped `org_admin`/`member` membership. Farm owner/operator/contact metadata never grants application access automatically. Explicit farm grants expose only the farm record; a separate survey grant is required for a shared multi-farm survey and its outputs. Only platform admins may promote organization admins in the first release.

Prefer additive, nullable relationships first. Keep legacy UUID tenant and asset-path behavior operational until real records are classified and every required mapping is reviewed. General multi-organization access is deferred.

## Development commands

Use the npm lockfile and the commands actually defined or documented by the repository:

```powershell
npm install
npm run dev
npm run turbo-dev
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

- `npm run dev` is Windows-specific (`set NEXT_DISABLE_TURBOPACK=1 && next dev`). The README documents `http://localhost:3000/asimov-hawks`.
- `npm run turbo-dev` opts into Turbopack.
- There is no formatting script and no unit/integration test script. Do not invent one in reports or automation.
- `npm run lint` currently fails in the ESLint flat-config compatibility layer because `prefer const` is resolved against a missing `@` plugin.
- `npx tsc --noEmit` currently reports existing TypeScript errors.
- `npm run build` currently reaches the Node heap limit in this checkout. Next config suppresses ESLint and TypeScript build failures, so a successful build would not replace separate checks.
- `npm run update-tile-bounds` and `npm run update-tile-bounds:force` write to Supabase using the service-role key. They are operational database commands, not routine validation; never run them without explicit approval and a confirmed target environment.

## Coding conventions

- Use lowercase kebab-case file/folder names; dynamic route parameters use `[name]`.
- Prefer named feature exports; App Router pages/layouts use default exports.
- Pages and layouts are Server Components unless browser APIs, hooks, MapLibre, Three.js, animation, or interactive state require `"use client"`.
- Keep MapLibre/Three.js behind `next/dynamic(..., { ssr: false })` callers.
- Use the `@/` path alias for cross-directory imports and relative imports only for nearby modules.
- Preserve strict TypeScript intent. Add explicit props/domain types and avoid adding `any`; existing untyped areas are debt, not a convention.
- Server data access belongs in `"use server"` actions using `utils/supabase/server.ts`. Authenticate before protected reads, handle Supabase errors, and return safe user-facing errors without secrets.
- Reuse the scoped map stores/providers. Use component-local state for ephemeral UI and the persisted global survey-mode store only for the cross-page mode preference.
- Reuse `components/ui/`, `cn()`, Tailwind utilities, CSS variables, and existing map constants/helpers. Do not fork another design system or duplicate map expressions.
- Preserve loading, empty, and error states when changing a data flow.

## Authentication and authorization

- Supabase email/password signup/login/logout and email OTP confirmation are implemented in `lib/actions/auth.ts` and `app/auth/confirm/route.ts`.
- Middleware refreshes sessions and provides broad route protection. Dashboard layouts and protected server actions independently call `auth.getUser()`; keep both defenses.
- The compatible application uses `profiles.organization_id` and `surveys.client_id` as the UUID tenant boundary. `profiles.access_code`, `profiles.organization`, and legacy survey code relationships remain only for expand-phase compatibility.
- `public.app_role` contains `platform_admin`, `org_admin`, `editor`, and `viewer`. RLS helpers and policies are checked in under `supabase/migrations/20260727002000_harden_uuid_authorization.sql`, and server-side tenant checks are centralized in `lib/auth/user-context.ts`. The current model still permits only one organization per profile.
- The first-release target replaces ambiguous global viewer/editor semantics with global `platform_admin`/`individual` account roles and organization-scoped `org_admin`/`member` memberships. Preserve current roles and policies during expansion; do not remove compatibility behavior before a separately approved contract release.
- Profiles are application accounts, not a general farmer/contact directory. Do not represent every farmer as a `profiles` row or every farmer as a `clients` row.
- The schema has no independent person/contact, organization type, organization membership, farm/plantation area, generic output/report, or audit model. Domain migrations and Admin Dashboard mutations are blocked until the approved planning gates are satisfied.
- UI filtering is not an authorization boundary. Preserve or strengthen database RLS and server-side checks; never rely on route parameters, hidden controls, or client state.
- Preserve the cookie-copying sequence and `auth.getUser()` call in `utils/supabase/middleware.ts`; its comments describe a session-integrity requirement.
- Treat signup exposure and redirect targets as security-sensitive. Validate redirect destinations before changing OTP handling.

## Database and Supabase rules

- Checked-in public tables are `clients`, `profiles`, `surveys`, `orthos`, and `point_clouds`. Checked-in storage SQL concerns the `detected-objects` bucket.
- `clients` contains mixed historical tenants, including organizations and individuals. Preserve it as the compatibility boundary and use separate reviewed client-to-organization or client-to-person mappings in the future model.
- `surveys` has `client_id` but no farm relationship. Future `survey_farms` must support multiple farms per survey; do not add a single canonical `surveys.farm_id`. `orthos` and `point_clouds` link to surveys through `survey_id`; detected objects, local tiles, generic model outputs, analytics, and reports do not have a complete relational output catalog.
- Checked-in migrations, RLS policies, private helper functions, generated types, tests, and verification SQL are evidence of the repository contract. The linked remote project must still be inspected before future database work; never infer current production or staging state from repository files alone.
- When database work is authorized, prefer establishing a Supabase CLI connection so the current schema, RLS/storage policies, functions, foreign keys, indexes, grants, and triggers can be inspected before planning changes. Confirm the target project and keep inspection read-only until mutation is explicitly approved.
- `docs/supabase-migration-runbook.md` defines the existing UUID expand-phase backup, rehearsal, verification, storage, contract, and recovery procedure. It must be revised and approved for the farmer/organization/farm domain before any new domain migration or deferred contract operation.
- Do not apply `supabase/deferred/contract_uuid_tenant_keys.sql` or `supabase/deferred/secure_detected_objects_storage.sql` until their documented domain, compatibility, and authorization gates pass and the exact target environment is approved.
- `SUPABASE_SERVICE_ROLE_KEY` is for local operations and administrative tasks only. It must not be used by deployment jobs or exposed through `NEXT_PUBLIC_*`, browser code, logs, or generated artifacts.
- Do not manually invent generated database types. If an approved generator is introduced or exists outside this checkout, regenerate through it and review the diff.
- The tile-bounds script updates `surveys.tile_*` fields and bypasses RLS with the service role. Confirm environment, backup/recovery, asset layout, and affected survey IDs before use; `--force` requires separate explicit approval.

## Geospatial and large-file rules

- `public/tiles/` and `public/3d/` are ignored and can be extremely large. Do not recursively copy, move, delete, format, hash, or commit them without an explicit asset-management plan.
- Tile paths encode client code, flight year, survey ID, `ortho`, and a tile folder; raster sources use TMS with 256 px tiles. Survey views honor `ortho.tile_folder`, while the combined orthomap currently uses `sharp-corners`.
- `getAllUserSurveys()` reads local tile directories synchronously to derive maximum zoom. Treat changes to runtime filesystem assumptions as deployment-sensitive.
- Point clouds are loaded whole in the browser through `PCDLoader`. Assess download size, memory, GPU limits, cancellation, and fallback behavior before expanding 3D features.
- Detection JSON is downloaded from Supabase Storage and parsed in full, then filtered in memory. Assess payload size and tenant isolation before changing its shape or scope.
- OSM raster tiles and MapLibre demo glyphs are external runtime dependencies. Preserve attribution and review provider usage/rate limits before production-scale changes.
- PMTiles is registered by the survey map caller but current raster sources use local PNG tiles. Do not assume PMTiles is the active storage format without tracing the target view.
- Keep GeoJSON coordinates in `[longitude, latitude]` order and validate bounds, numeric conversion, zoom limits, TMS/XYZ scheme, and empty-data behavior.
- Design and validate geospatial experiences for phones, tablets/iPads, laptops, and desktops used by farmers and field personnel. Include responsive controls, touch interaction, accessibility, constrained-network behavior, browser memory/GPU limits, and representative payload sizes in every map or point-cloud plan.

## Testing and validation

There is no automated test suite. Record all failed checks and distinguish pre-existing failures from regressions.

- UI-only change: run `npm run lint`, `npx tsc --noEmit`, and manually check relevant responsive, loading, empty, and error states.
- TypeScript/business logic: run lint and type-check; exercise both success and failure/empty paths manually until tests exist.
- Auth/authorization: additionally test unauthenticated redirect, session refresh, login/logout/OTP, permitted tenant access, denied cross-tenant access, and relevant Supabase RLS/policies in a non-production environment.
- Database/storage: review the authoritative migration/policy diff, test apply and rollback/recovery in a non-production environment, verify RLS and bucket policies, then exercise affected server actions. Never validate by mutating production.
- Geospatial/3D: manually test representative surveys with and without boundaries, tile bounds, orthos, detections, and point clouds; check tile requests, layer ordering, popups, both survey modes, accessibility, touch interaction, constrained-network behavior, memory/GPU use, and browser console/network errors across representative phone, tablet/iPad, laptop, and desktop viewports.
- Build/deployment: run lint, type-check, and `npm run build`; then smoke-test `/asimov-hawks`, auth confirmation, protected routes, static tiles, point clouds, and required environment variables in a preview environment.

Do not treat `next.config.ts`'s ignored lint/type failures as validation.

## Git workflow

- Inspect `git status --short` and `git rev-parse --abbrev-ref HEAD` before editing.
- The repository has `main` and `development`; current work is observed on `development`. Do not work directly on `main`.
- Treat `development` as the staging integration branch and `main` as production-only. Start implementation from an up-to-date `development` using the exact `phase/*` and `feature/*` branches in `docs/admin-dashboard-integration-plan.md`.
- Cut `release/admin-mvp-2026-09` for the September 21-25 staging candidate, merge it to `main` only after release acceptance, and tag the production deployment `admin-mvp-2026.09.0`.
- Create production fixes as `hotfix/<issue>` from `main`, then merge accepted fixes back into both `main` and `development`.
- Commit one reviewable schema, RLS, server, UI, test, or documentation unit at a time. Push phase branches after relevant checks pass and at review checkpoints; do not push known migration or authorization failures to integration or production branches.
- Recent history often uses conventional prefixes such as `feat(scope):`, `fix(scope):`, and `chore:`, but some commits are informal. Prefer a concise conventional subject that describes one scoped change.
- Preserve user changes, keep diffs focused, and do not mix unrelated cleanup.
- Do not commit, push, open a pull request, or rewrite history unless explicitly instructed.

## Change-planning rules

For a large change:

1. Inspect and trace every affected route, server action, component, store, asset path, schema object, policy, and deployment assumption.
2. Summarize current behavior with exact file paths and symbols.
3. List affected files, systems, external services, and user roles/tenants.
4. Identify database, RLS, storage, compatibility, large-file, performance, and rollback risks.
5. Propose an incremental implementation and migration plan.
6. Define automated/manual tests and measurable acceptance criteria.
7. Wait for approval before implementation.

## Prohibited actions

- Expose, print, commit, or move secrets or `.env*` values.
- Weaken authentication, authorization, tenant checks, RLS, storage policies, or session-cookie handling.
- Use the service-role key in browser code or deployment jobs, or run privileged local/admin scripts without explicit approval.
- Run destructive or production migrations, delete user/production data, or use `--force` operational modes without approval and recovery planning.
- Replace the established architecture or data/asset serving approach without evidence and justification.
- Change public routes, storage keys, database contracts, or asset paths without compatibility analysis.
- Edit generated files manually when an approved generator exists.
- Commit generated builds, tiles, point clouds, detection outputs, or other large generated assets.
- Silently change unrelated behavior or fix unrelated baseline issues.
