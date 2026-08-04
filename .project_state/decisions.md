# Decisions

Last updated: 2026-08-03

- Integrate Admin Dashboard work into the existing Next.js application under protected admin routes unless later evidence proves a separate frontend is required. This avoids duplicated auth/session/authorization contracts.
- Preserve UUID tenant compatibility through `profiles.organization_id` and `surveys.client_id` while additive domain tables mature.
- Treat profiles, people, clients, organizations, farms, surveys, outputs, and application accounts as distinct domain concepts.
- Keep normal accounts limited to one live organization membership for the first release; general multi-organization access is deferred.
- Preserve RLS and server-side checks as authorization boundaries. UI filtering is display behavior only.
- Keep service-role credentials local/admin-only. They must not appear in browser code, deployment jobs, logs, or generated artifacts.
- Keep workshop deployment limited to approved invited datasets and stable public-internet access through Cloudflare/NGINX/Supabase/protected asset origin.
- Do not apply deferred UUID contract cleanup or secure detected-object storage SQL until documented gates pass.
- Keep local tiles and point clouds out of production Docker images; asset publication must be independent, verified, reversible, and protected.
- Use compressed project state first for Codex context; retrieve deeper docs progressively by task.
