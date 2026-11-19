# Protected Asset Local Smoke Tests

Last updated: 2026-08-04

Status: runbook. Execute after the external WSL Docker NGINX stack is wired to
the Next.js `/asimov-hawks/internal/asset-auth` endpoint.

## Preconditions

- Local Supabase has the workshop manifest migrations applied.
- One 2026 approved manifest is active.
- Manifest entries exist for representative tile and point-cloud assets.
- The tested user has an active organization membership or is platform admin.
- External WSL NGINX routes protected asset paths through `auth_request`.
- External WSL NGINX forwards cookies and `X-Original-URI`.
- External WSL NGINX proxies authorized assets to internal MinIO.

## Test Matrix

Run requests through the NGINX public entry point, not directly against MinIO.

Replace host, cookie, organization, survey, and tile values with the local
workshop fixture values.

```powershell
$base = "http://localhost"
$tile = "$base/asimov-hawks/tiles/<client-code>/2026/<survey-id>/ortho/<tile-folder>/10/1/1.png"
$pcd = "$base/asimov-hawks/3d/<client-code>/2026/<survey-id>/odm.pcd"
```

Expected anonymous behavior:

```powershell
curl.exe -I $tile
curl.exe -I $pcd
```

- tile returns `401`;
- point cloud returns `401`;
- no redirect to login;
- no HTML body required.

Expected authenticated organization-member behavior:

```powershell
curl.exe -I $tile -H "Cookie: <browser-session-cookies>"
curl.exe -I $pcd -H "Cookie: <browser-session-cookies>"
curl.exe $tile -H "Cookie: <browser-session-cookies>" --output NUL
```

- tile `HEAD` or `GET` returns `200`;
- point-cloud `HEAD` returns `200`;
- point-cloud `HEAD` includes `Content-Length` when MinIO provides it;
- browser map loads representative protected tiles.

Expected denied behavior:

```powershell
curl.exe -I "$base/asimov-hawks/tiles/<other-client>/2026/<survey-id>/ortho/<tile-folder>/10/1/1.png" -H "Cookie: <browser-session-cookies>"
curl.exe -I "$base/asimov-hawks/tiles/<client-code>/2026/<survey-id>/ortho/unknown/10/1/1.png" -H "Cookie: <browser-session-cookies>"
```

- cross-organization request returns `401`;
- unknown route returns `401`;
- NGINX does not proxy denied requests to MinIO.

Expected platform-admin behavior:

```powershell
curl.exe -I $tile -H "Cookie: <platform-admin-session-cookies>"
```

- platform admin gets `200` for approved manifest assets.

## Browser Checks

- Survey map loads tiles through `/asimov-hawks/tiles/...`.
- Network panel shows tile requests hitting the NGINX public endpoint.
- 3D tab sends a `HEAD` request before `GET`.
- 3D tab loads a supported point cloud under 1 GB.
- Oversized point cloud displays `This point cloud exceeds the supported loading limit.`
- Failed point-cloud loads display `This point cloud cannot be loaded right now.`

## Failure Notes

- `302` means middleware/NGINX is treating auth as browser navigation instead of an auth subrequest.
- `401` for all authenticated users usually means cookies are not forwarded, `X-Original-URI` is wrong, no active manifest exists, or the route pattern does not match.
- `200` for anonymous requests means the NGINX protected route is bypassing auth.
- `404` or `502` after auth success usually means MinIO alias/prefix resolution or NGINX upstream routing is wrong.
