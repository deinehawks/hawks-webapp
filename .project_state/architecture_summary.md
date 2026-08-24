# Architecture Summary

Last updated: 2026-08-18

ASIMOV-HAWKS is a Next.js 15 App Router application for authenticated agricultural drone-survey users and platform operators. It uses React 19, TypeScript, Tailwind CSS 4, shadcn/Radix, Supabase Auth/Postgres/Storage, MapLibre, and Three.js/React Three Fiber.

Current major boundaries:

- `app/dashboard/`: user survey, orthomap, and geospatial experience.
- `app/dashboard/admin/`: legacy redirects retained during admin cutover.
- `app/admin/`: dedicated platform-admin route tree and layout.
- planned `app/org-admin/`: narrow organization-admin portal.
- `lib/actions/`: authenticated server-side reads and mutations.
- `utils/supabase/`: browser, server, and middleware Supabase clients.
- `supabase/`: migrations, RLS/RPC contracts, verification SQL, and pgTAP tests.

Authorization model:

- `profiles.role` supplies account authority: `platform_admin | user`.
- active `organization_memberships` supply portal/management authority:
  `org_admin | member`.
- ordinary members require explicit survey/farm grants for resources; scoped
  grants require active membership and confirmed organization relationships.
- null-organization grants supply narrow platform exceptions.
- `profiles.account_role` and `profiles.organization_id` are removed.
- `surveys.client_id`, client mappings, and legacy asset paths remain dataset compatibility relationships, not profile authorization.

Server Components and server actions own protected data access. Supabase RLS and server-side checks are the real boundary; client rendering is presentation only. Protected assets remain behind NGINX `auth_request`, active workshop-manifest checks, and membership/grant authorization.

The approved admin split stays inside one Next.js deployment: `/admin` and `/dashboard` share auth infrastructure and release operations but have separate layouts, navigation, landing behavior, and route guards.
