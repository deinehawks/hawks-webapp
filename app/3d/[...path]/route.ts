import { getWorkshopDataDirectory, serveWorkshopFile } from "@/lib/workshop-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Context) {
  const { path } = await context.params;
  return serveWorkshopFile(request, path, getWorkshopDataDirectory("3d"));
}

export const HEAD = GET;
