import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import SurveyDataInteractive from "@/components/survey-data-interactive";
import {
  getAllUserSurveys,
  getObjectDetectionData,
} from "@/lib/actions/surveys";

import { getWorkshopDemoCountMultipliers } from "@/lib/workshop-visibility";

export default async function Page() {
  const surveys = await getAllUserSurveys();
  const detectedObjects = await getObjectDetectionData();

  if (!surveys || !detectedObjects) {
    return (
      <div role="status" className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-base font-medium">Dashboard data is unavailable.</h1>
        <p className="text-sm text-muted-foreground">Please refresh the page to try again.</p>
      </div>
    );
  }

  return (
    <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards surveys={surveys} detectedObjects={detectedObjects} demoCountMultipliers={getWorkshopDemoCountMultipliers(surveys)} />
        <div className="px-4 lg:px-6 min-h-[600px] h-full">
          <SurveyDataInteractive data={surveys} />
        </div>
        <DataTable data={surveys} />
      </div>
    </div>
  );
}
