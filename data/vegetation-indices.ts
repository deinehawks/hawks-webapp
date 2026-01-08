export interface VegetationIndex {
  code: string;
  name: string;
  formula: string;
  range: string;
  description: string;
  formula_description: string;
}

export const vegetationIndices: VegetationIndex[] = [
  {
    code: "NDVI",
    name: "Normalized Difference Vegetation Index",
    formula: "NDVI = (NIR - Red) / (NIR + Red)",
    range: "[-1, 1]",
    description:
      "NDVI is used to quantify vegetation greenness and vitality. It also provides insights for productivity.",
    formula_description:
      "NDVI is calculated as the difference between the near-infrared and red reflectance values, normalized by their sum.",
  },
  {
    code: "NDRE",
    name: "Normalized Difference Red Edge Index",
    formula: "NDRE = (NIR - Red Edge) / (NIR + Red Edge)",
    range: "[-1, 1]",
    description:
      "NDRE serves as a key indicator of canopy characteristics and is highly sensitive to chlorophyll content within the canopy.",
    formula_description:
      "NDRE is calculated as the difference between the near-infrared and red edge reflectance values, normalized by their sum.",
  },
  {
    code: "GCI",
    name: "Green Chlorophyll Index",
    formula: "GCI = (NIR / Green) - 1",
    range: "[-1, 1]",
    description:
      "GCI is a relative indicator of chlorophyll content in plants and can be applied to evaluate plant growth conditions.",
    formula_description:
      "GCI is calculated by subtracting 1 from the ratio of near-infrared to green reflectance values:",
  },
  {
    code: "RECI",
    name: "Red Edge Chlorophyll Index",
    formula: "RECI = (NIR / Red Edge) - 1",
    range: "[-1, 1]",
    description:
      "RECI indicates the photosynthetic activity of the canopy cover for identifying areas with yellowing or shedding foliage.",
    formula_description:
      "RECI is calculated by subtracting 1 from the ratio of near-infrared to red edge reflectance values:",
  },
  {
    code: "CARI",
    name: "Chlorophyll Absorption Ratio Index",
    formula: "CARI = (Red Edge / Green) - 1",
    range: "[-1, 1]",
    description:
      "CARI is used to estimate chlorophyll content in plant leaves. It can be used to monitor plant health and stress, including frost damage.",
    formula_description:
      "CARI is calculated by subtracting 1 from the ratio of red-edge to green reflectance values:",
  },
  {
    code: "ARI",
    name: "Anthocyanin Reflectance Index",
    formula: "ARI = (1 / Green) - (1 / Red Edge)",
    range: "[-1, 1]",
    description:
      "ARI measures the reflectance of anthocyanins to indicate plant stress and the plant's physiological status.",
    formula_description:
      "ARI is calculated as the difference between the reciprocal of the green value and the reciprocal of the red edge value:",
  },
];
