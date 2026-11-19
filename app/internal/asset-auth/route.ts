import { NextRequest, NextResponse } from "next/server";

import { authorizeProtectedAssetRequest } from "@/lib/assets/protected-asset-auth";
import { createClient } from "@/utils/supabase/server";

function unauthorized() {
  return new NextResponse(null, { status: 401 });
}

export async function GET(request: NextRequest) {
  const originalUri = request.headers.get("x-original-uri");
  const supabase = await createClient();
  const result = await authorizeProtectedAssetRequest(supabase, originalUri);

  if (!result.authorized) {
    console.info("protected_asset_denied", {
      reason: result.reason,
      originalUri,
    });

    return unauthorized();
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      "X-Asset-Upstream-URI": result.upstreamUri,
    },
  });
}

export async function HEAD(request: NextRequest) {
  return GET(request);
}
