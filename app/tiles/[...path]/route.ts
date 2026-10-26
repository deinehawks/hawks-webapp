import { getWorkshopDataDirectory, serveWorkshopFile } from "@/lib/workshop-files";
import { authorizeProtectedAssetRequest } from "@/lib/assets/protected-asset-auth";
import {
  getWorkshopVisibility,
  hiddenWorkshopAssetResponse,
  applyWorkshopAssetCachePolicy,
} from "@/lib/workshop-visibility";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Context) {
  const { path } = await context.params;
  const policy = getWorkshopVisibility();
  const hidden = hiddenWorkshopAssetResponse(request, path, policy);
  if (hidden) return hidden;
  const supabase = await createClient();
  const authorization = await authorizeProtectedAssetRequest(
    supabase,
    new URL(request.url).pathname,
  ).catch(() => ({ authorized: false as const }));
  if (!authorization.authorized) {
    return new Response(request.method === "HEAD" ? null : "Unauthorized", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const response = await serveWorkshopFile(request, path, getWorkshopDataDirectory("tiles"));
  return applyWorkshopAssetCachePolicy(response, policy);
}

export const HEAD = GET;
