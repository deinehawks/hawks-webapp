import { DataTable, type SurveyTableRow } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import SurveyDataInteractive from "@/components/survey-data-interactive";
import {
  getAllUserSurveys,
  getObjectDetectionData,
} from "@/lib/actions/surveys";

import { AppSidebar } from "@/components/app-sidebar";
import { HeaderBreadcrumb } from "@/components/header-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getCurrentUserProfile } from "@/lib/actions/profiles";
import type { Survey } from "@/lib/types";


function toSurveyTableRows(surveys: Survey[]): SurveyTableRow[] {
  return surveys.flatMap((survey) => {
    if (
      survey.area == null ||
      !survey.area_code ||
      !survey.flight_date ||
      !survey.location ||
      survey.min_x == null ||
      survey.max_x == null ||
      survey.min_y == null ||
      survey.max_y == null ||
      !survey.geojson_boundaries
    ) {
      return [];
    }

    return [
      {
        id: survey.id,
        code: survey.code,
        area_code: survey.area_code,
        flight_date: new Date(survey.flight_date),
        location: survey.location,
        area: survey.area,
        tags: survey.tags ?? [],
        min_x: survey.min_x,
        max_x: survey.max_x,
        min_y: survey.min_y,
        max_y: survey.max_y,
        geojson_boundaries: survey.geojson_boundaries,
      },
    ];
  });
}
export default async function Page() {
  const userProfile = await getCurrentUserProfile();
  const surveys = await getAllUserSurveys();
  const detectedObjects = await getObjectDetectionData();
  const surveyTableRows = toSurveyTableRows(surveys);

  if (!surveys || !detectedObjects) return <div className="flex"></div>;

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards surveys={surveys} detectedObjects={detectedObjects} />
        <div className="px-4 lg:px-6 min-h-[600px] h-full">
          <SurveyDataInteractive data={surveys} />
        </div>
        <DataTable data={surveyTableRows} />
      </div>
    </div>
  );
}
