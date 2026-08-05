const DEFAULT_ASSET_BASE_URL = "/asimov-hawks";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/g, "");
}

function normalizePath(path: string): string {
  return path.replace(/^\/+/g, "");
}

export function getAssetBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? DEFAULT_ASSET_BASE_URL,
  );
}

export function buildAssetUrl(path: string): string {
  return `${getAssetBaseUrl()}/${normalizePath(path)}`;
}

export function buildTileAssetUrl({
  clientCode,
  surveyId,
  tileFolder,
  year,
}: {
  clientCode: string;
  surveyId: string;
  tileFolder: string;
  year: number;
}): string {
  return buildAssetUrl(
    `tiles/${clientCode.toLowerCase()}/${year}/${surveyId}/ortho/${tileFolder}/{z}/{x}/{y}.png`,
  );
}

export function buildPointCloudAssetUrl({
  clientCode,
  fileName,
  surveyId,
  year,
}: {
  clientCode: string;
  fileName: "odm.pcd" | "lidar.pcd";
  surveyId: string;
  year: number;
}): string {
  return buildAssetUrl(
    `3d/${clientCode.toLowerCase()}/${year}/${surveyId}/${fileName}`,
  );
}
