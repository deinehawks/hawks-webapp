import { DataTable, type SurveyTableRow } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import SurveyDataInteractive from "@/components/survey-data-interactive";
import type { ComputerVisionObject, Survey } from "@/lib/types";

function toSurveyTableRows(surveys: Survey[]): SurveyTableRow[] {
  return surveys.flatMap((survey) => {
    if (survey.area == null || !survey.area_code || !survey.flight_date ||
      !survey.location || survey.min_x == null || survey.max_x == null ||
      survey.min_y == null || survey.max_y == null || !survey.geojson_boundaries) return [];
    return [{
      id: survey.id, code: survey.code, area_code: survey.area_code,
      flight_date: new Date(survey.flight_date), location: survey.location,
      area: survey.area, tags: survey.tags ?? [], min_x: survey.min_x,
      max_x: survey.max_x, min_y: survey.min_y, max_y: survey.max_y,
      geojson_boundaries: survey.geojson_boundaries,
    }];
  });
}

export function UserDashboardOverview({
  surveys, detectedObjects, surveyHrefBase = "/dashboard/surveys",
  orthomapHrefBase = "/dashboard/orthomap",
}: {
  surveys: Survey[]; detectedObjects: ComputerVisionObject[];
  surveyHrefBase?: string; orthomapHrefBase?: string;
}) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards surveys={surveys} detectedObjects={detectedObjects} />
        <div className="min-h-[600px] h-full px-4 lg:px-6">
          <SurveyDataInteractive data={surveys} surveyHrefBase={surveyHrefBase} />
        </div>
        <DataTable data={toSurveyTableRows(surveys)}
          orthomapHrefBase={orthomapHrefBase} surveyHrefBase={surveyHrefBase} />
      </div>
    </div>
  );
}
