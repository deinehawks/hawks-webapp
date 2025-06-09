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

export enum GeometryType {
  Point = "Point",
  LineString = "LineString",
  Polygon = "Polygon",
  MultiPoint = "MultiPoint",
  MultiLineString = "MultiLineString",
  MultiPolygon = "MultiPolygon",
}
