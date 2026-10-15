import { getWorkshopDataDirectory, serveWorkshopFile } from "@/lib/workshop-files";
import {
  getWorkshopVisibility,
  hiddenWorkshopAssetResponse,
  applyWorkshopAssetCachePolicy,
} from "@/lib/workshop-visibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Context) {
  const { path } = await context.params;
  const policy = getWorkshopVisibility();
  const hidden = hiddenWorkshopAssetResponse(request, path, policy);
  if (hidden) return hidden;
  const response = await serveWorkshopFile(request, path, getWorkshopDataDirectory("3d"));
  return applyWorkshopAssetCachePolicy(response, policy);
}

export const HEAD = GET;
