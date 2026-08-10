# AGENTS.override.md

This compact override is the active project guidance. It intentionally replaces the longer root `AGENTS.md` during Codex instruction discovery.

## Startup Procedure

Use the compressed project state before reading broader documentation.

At the start of normal work, read only:

- `.project_state/current_state.md`
- `.project_state/active_context.md`
- `.project_state/backlog.md`
- `.project_state/session_handoff.md`

Do not perform a full project review unless the user explicitly asks for one.

Use progressive context retrieval:

1. Project state files.
2. Relevant source files.
3. Relevant documentation sections from `.project_state/project_index.md`.
4. Full documentation review only when required by the task or explicitly requested.

After completing work, update these files when project state changes:

- `.project_state/current_state.md`
- `.project_state/active_context.md`
- `.project_state/backlog.md`
- `.project_state/session_handoff.md`

Keep project-state files concise. Move detailed investigation, decisions, logs, and one-off findings to normal docs and link them from `.project_state/project_index.md` or `.project_state/decisions.md`.

## Project Overview

ASIMOV-HAWKS is a Next.js dashboard for authenticated users to inspect agricultural drone surveys. It lists survey areas, summarizes banana-plant detections, renders survey and organization-wide orthomosaics, and displays ODM/LiDAR point clouds.

The compatible application uses UUID tenant relationships through `profiles.organization_id` and `surveys.client_id` while retaining legacy code columns during the expand phase. Additive domain work separates profiles, people, organizations, farms, surveys, outputs, memberships, grants, and audit records.

Workshop delivery is a limited public-internet deployment for invited users on September 28-30, 2026, followed by stabilization, documentation, and handoff on October 1-9, 2026. Protect the deadline by migrating only approved invited-client datasets and deferring full-history migration, broad automation, destructive workflows, DAM, advanced analytics, and general multi-organization access.

## Technology And Repo Map

- Stack: Next.js 15 App Router, React 19, TypeScript 5, Tailwind CSS 4, shadcn/Radix, Supabase, MapLibre, Three.js, Zustand.
- `app/`: App Router layouts, pages, loading/error states, and email OTP route handler.
- `components/`: feature components; `maps/`, `callers/`, `threejs/`, and `ui/` are important subtrees.
- `lib/actions/`: server actions for auth, profiles, clients, surveys, admin/domain operations, and detected-object downloads.
- `lib/auth/user-context.ts`: centralized user/tenant context and access checks.
- `utils/supabase/`: browser, server, and middleware Supabase clients.
- `supabase/`: migrations, deferred SQL, verification SQL, and pgTAP tests.
- `public/tiles/` and `public/3d/`: ignored large runtime assets.
- `.project_state/`: compressed state for low-token Codex startup.

For documentation routing, use `.project_state/project_index.md`.

## Development Commands

Use the npm lockfile and existing scripts:

```powershell
npm install
npm run dev
npm run turbo-dev
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

- `npm run dev` is Windows-specific and serves `http://localhost:3000/asimov-hawks`.
- There is no formatting script and no general unit/integration test script.
- `npm run lint` currently has a documented ESLint flat-config compatibility failure.
- `npx tsc --noEmit` currently has existing TypeScript errors.
- `npm run build` currently reaches the Node heap limit in this checkout.
- Operational mutation scripts, service-role scripts, and `--force` commands require explicit approval and confirmed target environment.

## Coding Conventions

- Use lowercase kebab-case file/folder names; dynamic route parameters use `[name]`.
- Prefer named feature exports; App Router pages/layouts use default exports.
- Pages and layouts are Server Components unless browser APIs, hooks, MapLibre, Three.js, animation, or interactive state require `"use client"`.
- Keep MapLibre/Three.js behind `next/dynamic(..., { ssr: false })` callers.
- Use the `@/` path alias for cross-directory imports and relative imports only for nearby modules.
- Preserve strict TypeScript intent. Add explicit props/domain types and avoid adding `any`.
- Reuse server actions for protected reads and mutations; authenticate before protected access.
- Reuse `components/ui/`, `cn()`, Tailwind utilities, CSS variables, and existing map constants/helpers.
- Preserve loading, empty, and error states when changing data flow.

## Authentication And Authorization

- Middleware refreshes sessions and redirects unauthenticated non-auth routes. Preserve the cookie-copying sequence and `auth.getUser()` call in `utils/supabase/middleware.ts`.
- Server layouts/pages and protected actions must independently call `auth.getUser()`.
- Current compatibility uses `profiles.organization_id` and `surveys.client_id` as the UUID tenant boundary.
- UI filtering is not authorization. Preserve or strengthen RLS and server-side checks.
- Do not weaken signup, redirect, OTP, tenant, role, RLS, storage, or session-cookie behavior.
- Profiles are application accounts, not a general farmer/contact directory.
- Only platform admins may perform approved platform-admin workflows in the first release.

## Database And Supabase Rules

- Checked-in migrations and SQL are repository contract evidence, not proof of remote staging or production state.
- Inspect the target Supabase project read-only before future database work.
- Prefer additive, nullable relationships first. Keep legacy UUID tenant and asset-path behavior operational until mappings and gates are reviewed.
- Do not apply `supabase/deferred/contract_uuid_tenant_keys.sql` or `supabase/deferred/secure_detected_objects_storage.sql` until documented gates pass.
- Do not manually invent generated database types. Regenerate only through an approved generator and review the diff.
- `SUPABASE_SERVICE_ROLE_KEY` is local/admin-only. Never expose it through browser code, `NEXT_PUBLIC_*`, deployment jobs, logs, or generated artifacts.
- Never mutate production for validation.

## Geospatial And Large Files

- `public/tiles/` and `public/3d/` are ignored and can be extremely large. Do not recursively copy, move, delete, format, hash, or commit them without an explicit asset-management plan.
- Preserve tile path, TMS/XYZ, base-path, point-cloud, detection JSON, and GeoJSON coordinate-order assumptions unless the task explicitly addresses them.
- Keep coordinates in `[longitude, latitude]` order.
- Test representative surveys with and without boundaries, tile bounds, orthos, detections, and point clouds for geospatial/3D work.
- Consider constrained networks, browser memory/GPU limits, touch interaction, accessibility, and representative phone/tablet/laptop/desktop viewports.

## Workshop Deployment Boundary

The workshop release is public-internet for invited users. Stable app and asset URLs must work through Cloudflare and NGINX from external networks while Supabase authentication, organization membership, explicit grants, and protected asset delivery remain fail-closed.

Migrate only records and assets in an approved workshop manifest. Keep populated manifests outside Git when they contain personal, private, or operationally sensitive data. Verify file counts, bytes, checksums, relational references, authorization scope, external-internet access, and rollback sources.

Cloudflare must not turn restricted survey assets into public cache entries. Protected asset delivery is a blocking design decision before asset cutover.

## Testing And Validation

Record failed checks and distinguish pre-existing failures from regressions.

- UI-only change: run `npm run lint`, `npx tsc --noEmit`, and manually check relevant responsive/loading/empty/error states when practical.
- TypeScript/business logic: run lint and type-check; exercise success, failure, and empty paths.
- Auth/authorization: additionally test unauthenticated redirect, session refresh, login/logout/OTP, permitted tenant access, denied cross-tenant access, and relevant RLS/policies in non-production.
- Database/storage: review migration/policy diff, test apply and rollback in non-production, verify RLS and bucket policies, then exercise affected actions.
- Geospatial/3D: test representative payloads, tile requests, layer ordering, popups, modes, touch, accessibility, network behavior, memory/GPU, and browser console/network errors.
- Build/deployment: run lint, type-check, build, then smoke-test `/asimov-hawks`, auth confirmation, protected routes, static tiles, point clouds, and required env vars in preview.
- Documentation-only workflow changes do not require application validation; inspect the diff and update project state.

## Git Workflow

- Inspect `git status --short` and `git rev-parse --abbrev-ref HEAD` before editing.
- Do not work directly on `main`. `development` is staging integration; `main` is production-only.
- Preserve user changes and keep diffs focused.
- Do not commit, push, open PRs, or rewrite history unless explicitly instructed.
- Never use destructive commands such as `git reset --hard` or `git checkout --` unless explicitly requested.

## Large Change Planning

For large or risky changes, inspect and trace affected routes, server actions, components, stores, asset paths, schema objects, policies, and deployment assumptions. Summarize current behavior, affected files/systems/roles, risks, incremental plan, validation, and acceptance criteria before implementation.

Wait for approval before implementing large schema, RLS, storage, destructive, deployment, or public-route changes.

## Prohibited Actions

- Expose, print, commit, or move secrets or `.env*` values.
- Weaken authentication, authorization, tenant checks, RLS, storage policies, or session handling.
- Use service-role credentials in browser/runtime/deployment code.
- Run destructive or production migrations, delete user/production data, or use operational `--force` modes without approval and recovery planning.
- Replace established architecture or data/asset serving without evidence and justification.
- Change public routes, storage keys, database contracts, or asset paths without compatibility analysis.
- Edit generated files manually when an approved generator exists.
- Commit generated builds, tiles, point clouds, detection outputs, or other large generated assets.
- Silently change unrelated behavior.
