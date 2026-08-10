import "server-only";

const DEFAULT_PROTECTED_GIS_ALIAS = "workshop-protected-gis";

export type AssetStorageTarget = {
  upstreamUri: string;
};

export type ProtectedAssetStorageRequest = {
  destinationStorageAlias: string | null;
  destinationPrefixAlias: string | null;
  objectPath: string;
};

function cleanPathSegment(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function requireSafeAlias(value: string | null, fallback: string): string {
  const alias = value ?? fallback;

  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(alias)) {
    throw new Error("Invalid protected asset storage alias.");
  }

  return alias;
}

function resolveStorageRoot(alias: string): string {
  const configured =
    process.env[`PROTECTED_ASSET_STORAGE_${alias.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_ROOT`] ??
    process.env.PROTECTED_ASSET_STORAGE_ROOT ??
    alias;

  return cleanPathSegment(configured);
}

function resolvePrefix(alias: string | null): string {
  if (!alias) return "";

  const configured =
    process.env[`PROTECTED_ASSET_PREFIX_${alias.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`] ??
    alias;

  return cleanPathSegment(configured);
}

export function resolveProtectedAssetStorageTarget({
  destinationStorageAlias,
  destinationPrefixAlias,
  objectPath,
}: ProtectedAssetStorageRequest): AssetStorageTarget {
  const storageAlias = requireSafeAlias(
    destinationStorageAlias,
    DEFAULT_PROTECTED_GIS_ALIAS,
  );
  const storageRoot = resolveStorageRoot(storageAlias);
  const prefix = resolvePrefix(destinationPrefixAlias);
  const cleanedObjectPath = cleanPathSegment(objectPath);
  const upstreamUri = ["", storageRoot, prefix, cleanedObjectPath]
    .filter(Boolean)
    .join("/");

  if (upstreamUri.includes("..")) {
    throw new Error("Invalid protected asset upstream path.");
  }

  return {
    upstreamUri,
  };
}
