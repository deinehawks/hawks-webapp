import "server-only";
import { cache } from "react";
import type { Database, Tables } from "@/lib/database.types";
import { requireRecordingAccount } from "./context";
import { RECORDING_PCD_MAX_BYTES } from "./limits";

type Row = Tables<"surveys"> & {
  client: Pick<Tables<"clients">, "id" | "code" | "name"> | null;
  orthos: Tables<"orthos">[];
  point_clouds: Tables<"point_clouds">[];
};
const select =
  "*, client:clients!surveys_client_id_fkey(id,code,name), orthos!orthos_survey_id_fkey(*), point_clouds!point_clouds_survey_id_fkey(*)";

type PublishedAsset =
  Database["public"]["Functions"]["list_authorized_published_survey_assets"]["Returns"][number];

function parseBounds(value: PublishedAsset["bounds"]): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 4) {
    return null;
  }
  const coordinates: unknown[] = value;
  if (
    !coordinates.every(
      (coordinate) =>
        typeof coordinate === "number" && Number.isFinite(coordinate),
    )
  ) {
    return null;
  }
  const [minX, minY, maxX, maxY] = coordinates as [
    number,
    number,
    number,
    number,
  ];
  return minX < maxX && minY < maxY ? [minX, minY, maxX, maxY] : null;
}

function resolvePointCloudUrl(asset: PublishedAsset): string | null {
  if (!asset.route_template.startsWith("/asimov-hawks/3d/")) return null;
  if (!asset.route_template.includes("{file}")) return asset.route_template;
  return asset.file_name
    ? asset.route_template.replace("{file}", asset.file_name)
    : null;
}

export const loadRecordingSurveys = cache(async () => {
  const { supabase } = await requireRecordingAccount();
  const { data: assetData, error: assetError } = await supabase.rpc(
    "list_authorized_published_survey_assets",
  );
  if (assetError)
    throw new Error("Failed to load published survey assets.", {
      cause: assetError,
    });
  const assets = (assetData ?? []) as PublishedAsset[];
  const ids = [...new Set(assets.map((asset) => asset.survey_id))];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("surveys")
    .select(select)
    .in("id", ids)
    .order("id");
  if (error)
    throw new Error("Failed to load recording surveys.", { cause: error });
  return (data as Row[]).map((row) => {
    const surveyAssets = assets.filter((asset) => asset.survey_id === row.id);
    const ortho = row.ortho
      ? (row.orthos.find((item) => item.is_current && item.id === row.ortho) ??
        null)
      : null;
    const cloud = row.point_cloud
      ? (row.point_clouds.find(
          (item) => item.is_current && item.code === row.point_cloud,
        ) ?? null)
      : null;
    const clientCode = row.client?.code.toLowerCase() ?? "";
    const tileAsset = surveyAssets.find(
      (asset) =>
        asset.output_type === "orthomosaic" &&
        asset.client_code.toLowerCase() === clientCode &&
        asset.artifact_code === ortho?.id &&
        asset.tile_folder === ortho?.tile_folder &&
        asset.route_template.startsWith("/asimov-hawks/tiles/") &&
        parseBounds(asset.bounds) !== null &&
        asset.min_zoom !== null &&
        asset.max_zoom !== null,
    );
    const bounds = tileAsset ? parseBounds(tileAsset.bounds) : null;
    const cloudAsset = surveyAssets.find(
      (asset) =>
        asset.output_type === "point_cloud" &&
        asset.client_code.toLowerCase() === clientCode &&
        asset.artifact_code === cloud?.code &&
        asset.byte_size !== null &&
        asset.byte_size > 0 &&
        asset.byte_size <= RECORDING_PCD_MAX_BYTES &&
        resolvePointCloudUrl(asset) !== null,
    );
    const cloudUrl = cloudAsset ? resolvePointCloudUrl(cloudAsset) : null;
    const cloudBytes = cloudAsset?.byte_size;
    const clouds = cloudAsset && cloudUrl && typeof cloudBytes === "number"
      ? [{ url: cloudUrl, bytes: cloudBytes }]
      : [];
    const { orthos: _orthos, point_clouds: _clouds, ...survey } = row;
    return {
      ...survey,
      code: row.client?.code ?? "",
      access_code: row.client?.code ?? "", // V2 presentation only, never authorization.
      tags: row.tags ?? [],
      boundaries: row.boundaries ?? [],
      geojson_boundaries: row.geojson_boundaries ?? [],
      min_x: row.min_x ?? bounds?.[0] ?? row.tile_min_x,
      min_y: row.min_y ?? bounds?.[1] ?? row.tile_min_y,
      max_x: row.max_x ?? bounds?.[2] ?? row.tile_max_x,
      max_y: row.max_y ?? bounds?.[3] ?? row.tile_max_y,
      ortho,
      point_cloud: cloud,
      tile_url: tileAsset?.route_template ?? null,
      min_zoom: tileAsset?.min_zoom ?? undefined,
      max_zoom: tileAsset?.max_zoom ?? undefined,
      tile_min_x: bounds?.[0] ?? row.tile_min_x,
      tile_min_y: bounds?.[1] ?? row.tile_min_y,
      tile_max_x: bounds?.[2] ?? row.tile_max_x,
      tile_max_y: bounds?.[3] ?? row.tile_max_y,
      recording_clouds: clouds,
      recording_ready: !!tileAsset && !!row.flight_date,
    };
  });
});
