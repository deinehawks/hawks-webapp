import "server-only";

import type { Json } from "@/lib/database.types";
import { resolveProtectedAssetStorageTarget } from "@/lib/assets/minio-aliases";
import type { createClient as createServerSupabaseClient } from "@/utils/supabase/server";

const APP_BASE_PATH = "/asimov-hawks";
const WORKSHOP_DATASET_YEAR = 2026;
const SUPPORTED_POINT_CLOUD_FILES = new Set(["odm.pcd", "lidar.pcd"]);

type AppSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type WorkshopManifestEntryRow = {
  id: string;
  manifest_id: string;
  entry_type: string;
  organization_id: string | null;
  client_id: string | null;
  survey_id: string | null;
  reference_key: string;
  destination_storage_alias: string | null;
  destination_prefix_alias: string | null;
  protection_level: string;
  metadata: Json;
};

export type ParsedProtectedAssetRequest =
  | {
      type: "tile_group";
      originalUri: string;
      clientCode: string;
      year: number;
      surveyId: string;
      tileFolder: string;
      z: number;
      x: number;
      y: number;
      extension: "png";
      objectPath: string;
    }
  | {
      type: "point_cloud";
      originalUri: string;
      clientCode: string;
      year: number;
      surveyId: string;
      fileName: "odm.pcd" | "lidar.pcd";
      objectPath: string;
    };

export type ProtectedAssetAuthorizationResult =
  | {
      authorized: true;
      upstreamUri: string;
    }
  | {
      authorized: false;
      reason: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringMetadata(value: Json, key: string): string | null {
  if (!isRecord(value)) return null;
  const field = value[key];
  return typeof field === "string" ? field : null;
}

function hasUnsafePathSegment(segments: string[]): boolean {
  return segments.some(
    (segment) =>
      segment.length === 0 ||
      segment === "." ||
      segment === ".." ||
      segment.includes("\\") ||
      segment.includes("%2e") ||
      segment.includes("%2E"),
  );
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parseProtectedAssetRequest(
  originalUri: string | null,
): ParsedProtectedAssetRequest | null {
  if (!originalUri) return null;

  let pathname: string;
  try {
    pathname = new URL(originalUri, "http://internal.local").pathname;
  } catch {
    return null;
  }

  const decodedPathname = decodeURIComponent(pathname);
  const segments = decodedPathname.split("/").filter(Boolean);

  if (hasUnsafePathSegment(segments)) return null;
  if (segments[0] !== APP_BASE_PATH.replace("/", "")) return null;

  const [, assetRoot, clientCode, yearValue, surveyId, mode, ...rest] =
    segments;
  const year = parsePositiveInteger(yearValue ?? "");

  if (!clientCode || !surveyId || year !== WORKSHOP_DATASET_YEAR) return null;

  if (assetRoot === "tiles") {
    const [tileFolder, zValue, xValue, yFileName] =
      mode === "ortho" ? rest : [];
    const z = parsePositiveInteger(zValue ?? "");
    const x = parsePositiveInteger(xValue ?? "");
    const yMatch = yFileName?.match(/^(\d+)\.png$/);
    const y = yMatch ? parsePositiveInteger(yMatch[1]) : null;

    if (
      mode !== "ortho" ||
      !tileFolder ||
      z === null ||
      x === null ||
      y === null ||
      rest.length !== 4
    ) {
      return null;
    }

    return {
      type: "tile_group",
      originalUri,
      clientCode,
      year,
      surveyId,
      tileFolder,
      z,
      x,
      y,
      extension: "png",
      objectPath: `tiles/${tileFolder}`,
    };
  }

  if (assetRoot === "3d") {
    const fileName = mode;

    if (
      !fileName ||
      rest.length !== 0 ||
      !SUPPORTED_POINT_CLOUD_FILES.has(fileName)
    ) {
      return null;
    }

    return {
      type: "point_cloud",
      originalUri,
      clientCode,
      year,
      surveyId,
      fileName: fileName as "odm.pcd" | "lidar.pcd",
      objectPath: `point-clouds/${fileName}`,
    };
  }

  return null;
}

async function findManifestEntry(
  supabase: AppSupabaseClient,
  request: ParsedProtectedAssetRequest,
): Promise<WorkshopManifestEntryRow | null> {
  const { data, error } = await supabase.rpc(
    "authorize_workshop_protected_asset" as never,
    {
      requested_dataset_year: request.year,
      requested_entry_type: request.type,
      requested_survey_id: request.surveyId,
      requested_original_uri: request.originalUri,
    } as never,
  );

  if (error || !Array.isArray(data)) return null;

  return (data as WorkshopManifestEntryRow[])[0] ?? null;
}

function getObjectPath(
  request: ParsedProtectedAssetRequest,
  entry: WorkshopManifestEntryRow,
): string {
  const metadataObjectPath = getStringMetadata(entry.metadata, "object_path");

  if (request.type === "tile_group") {
    const prefix = metadataObjectPath ?? request.objectPath;
    const tileSuffix = `${request.z}/${request.x}/${request.y}.png`;
    return prefix.endsWith(tileSuffix) ? prefix : `${prefix}/${tileSuffix}`;
  }

  return metadataObjectPath ?? request.objectPath;
}

export async function authorizeProtectedAssetRequest(
  supabase: AppSupabaseClient,
  originalUri: string | null,
): Promise<ProtectedAssetAuthorizationResult> {
  const parsed = parseProtectedAssetRequest(originalUri);
  if (!parsed) return { authorized: false, reason: "malformed_request" };

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, reason: "unauthenticated" };
  }

  const entry = await findManifestEntry(supabase, parsed);
  if (!entry) return { authorized: false, reason: "manifest_entry_not_found" };

  try {
    const target = resolveProtectedAssetStorageTarget({
      destinationStorageAlias: entry.destination_storage_alias,
      destinationPrefixAlias: entry.destination_prefix_alias,
      objectPath: getObjectPath(parsed, entry),
    });

    return {
      authorized: true,
      upstreamUri: target.upstreamUri,
    };
  } catch {
    return { authorized: false, reason: "storage_alias_invalid" };
  }
}