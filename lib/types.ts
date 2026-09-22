import type { Database, Tables } from "@/lib/database.types";

export type ComputerVisionObject = {
  label: string;
  bbox: {
    min_lat: number;
    min_lon: number;
    max_lat: number;
    max_lon: number;
    cen_lat: number;
    cen_lon: number;
  };
  pairId: string;
  areaPairId: string;
  areaCode: string;
};

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Client = Tables<"clients">;
export type Ortho = Tables<"orthos">;
export type PointCloud = Tables<"point_clouds">;

export type UserProfile = Omit<
  Tables<"profiles">,
  "access_code" | "organization"
>;

export type Survey = Omit<
  Tables<"surveys">,
  "access_code" | "code" | "organization_code" | "ortho" | "point_cloud"
> & {
  client: Pick<Client, "id" | "code" | "name">;
  code: string;
  ortho: Ortho | null;
  point_cloud: PointCloud | null;
  max_zoom?: number;
};

export enum GeometryType {
  Point = "Point",
  LineString = "LineString",
  Polygon = "Polygon",
  MultiPoint = "MultiPoint",
  MultiLineString = "MultiLineString",
  MultiPolygon = "MultiPolygon",
}
