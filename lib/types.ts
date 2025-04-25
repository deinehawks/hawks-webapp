export type ComputerVisionObject = {
  label: string;
  bbox: {
    min_lat: number;
    min_lon: number;
    max_lat: number;
    max_lon: number;
  };
  pairId: string;
  areaPairId: string;
  areaCode: string;
};
