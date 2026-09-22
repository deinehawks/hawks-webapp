export const SURVEY_OUTPUT_TYPES = [
  "orthomosaic",
  "point_cloud",
  "object_detection",
  "other",
] as const;

export type SurveyOutputType = (typeof SURVEY_OUTPUT_TYPES)[number];

export const SURVEY_OUTPUT_TYPE_OPTIONS: ReadonlyArray<{
  label: string;
  value: SurveyOutputType;
}> = [
  { label: "Orthomosaic", value: "orthomosaic" },
  { label: "Point Cloud", value: "point_cloud" },
  { label: "Object Detection", value: "object_detection" },
  { label: "Other", value: "other" },
];

export function isSurveyOutputType(value: string): value is SurveyOutputType {
  return (SURVEY_OUTPUT_TYPES as readonly string[]).includes(value);
}
