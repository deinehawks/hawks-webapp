# Architecture Summary

Last updated: 2026-08-03

ASIMOV-HAWKS is a Next.js 15 App Router dashboard for authenticated agricultural drone-survey users. It uses React 19, TypeScript, Tailwind CSS 4, shadcn/Radix primitives, Supabase Auth/Postgres/Storage, MapLibre for orthomosaics, and Three.js/React Three Fiber for point clouds.

Major components:

- `app/`: server-first App Router routes, layouts, loading/error states, and auth confirmation.
- `lib/actions/`: server actions for auth, profiles, clients, surveys, admin/domain operations, and detected-object downloads.
- `utils/supabase/`: browser, server, and middleware Supabase clients.
- `components/maps/`, `components/callers/`, `components/threejs/`: browser-only geospatial and 3D views loaded dynamically.
- `providers/` and `stores/`: scoped Zustand map state plus persisted survey-mode preference.
- `supabase/`: checked-in migrations, deferred SQL, verification SQL, and pgTAP tests.

Server Components and server actions own protected data access. Client components may render maps, point clouds, and UI state, but must not become authorization boundaries. Supabase RLS and server-side tenant checks remain the real access controls.

The compatible tenant boundary is still `profiles.organization_id` and `surveys.client_id`, while additive domain tables introduce people, organizations, memberships, farms, grants, mappings, outputs, and audit records. Legacy paths must stay operational until approved contract gates pass.

Key constraints:

- Preserve `basePath: "/asimov-hawks"` for routes and assets.
- Do not expose or use `SUPABASE_SERVICE_ROLE_KEY` in browser/runtime/deployment code.
- Do not run privileged Supabase scripts, destructive operations, asset migrations, or `--force` commands without explicit approval.
- Treat `public/tiles/` and `public/3d/` as large operational assets.
- Workshop deployment is limited public internet for invited users, not LAN-only.
