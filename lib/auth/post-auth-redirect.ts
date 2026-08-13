import "server-only";

import type { Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type AccountRole = Tables<"profiles">["role"];

const DASHBOARD_PATH = "/dashboard";
const ADMIN_PATH = "/admin";
const LEGACY_ADMIN_PATH = "/dashboard/admin";
const BASE_PATH = "/asimov-hawks";

function isBaseDashboardPath(path: string): boolean {
  return (
    path === DASHBOARD_PATH ||
    path === `${BASE_PATH}${DASHBOARD_PATH}` ||
    path === LEGACY_ADMIN_PATH ||
    path === `${BASE_PATH}${LEGACY_ADMIN_PATH}`
  );
}

export function getHomePathForRole(role: AccountRole | null | undefined): string {
  return role === "platform_admin" ? ADMIN_PATH : DASHBOARD_PATH;
}

export function normalizeAdminPath(path: string): string {
  if (path === LEGACY_ADMIN_PATH) {
    return ADMIN_PATH;
  }

  if (path.startsWith(`${LEGACY_ADMIN_PATH}/`)) {
    return `${ADMIN_PATH}${path.slice(LEGACY_ADMIN_PATH.length)}`;
  }

  if (path === `${BASE_PATH}${LEGACY_ADMIN_PATH}`) {
    return `${BASE_PATH}${ADMIN_PATH}`;
  }

  if (path.startsWith(`${BASE_PATH}${LEGACY_ADMIN_PATH}/`)) {
    return `${BASE_PATH}${ADMIN_PATH}${path.slice(
      `${BASE_PATH}${LEGACY_ADMIN_PATH}`.length,
    )}`;
  }

  return path;
}

export async function resolveAuthenticatedRole(): Promise<AccountRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to resolve authenticated account role.", {
      cause: error,
    });
  }

  return data?.role ?? null;
}

export function resolvePostAuthRedirectPath({
  role,
  next,
}: {
  role: AccountRole | null | undefined;
  next?: string | null;
}): string {
  if (!next || isBaseDashboardPath(next)) {
    return getHomePathForRole(role);
  }

  return normalizeAdminPath(next);
}

export async function resolveAuthenticatedHomePath(
  fallback = DASHBOARD_PATH,
): Promise<string> {
  const role = await resolveAuthenticatedRole();
  return role ? getHomePathForRole(role) : fallback;
}
