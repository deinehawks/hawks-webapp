import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import SurveyDataInteractive from "@/components/survey-data-interactive";
import {
  getAllUserSurveys,
  getObjectDetectionData,
} from "@/lib/actions/surveys";

export default async function Page() {
  const surveys = await getAllUserSurveys();

  if (!surveys.length) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">No surveys assigned</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account is active, but it does not have access to any recording surveys yet.
            Ask a platform administrator to assign the required surveys.
          </p>
        </div>
      </div>
    );
  }

  const detectedObjects = await getObjectDetectionData();

  if (!surveys || !detectedObjects) return <div className="flex"></div>;

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards surveys={surveys} detectedObjects={detectedObjects} />
        <div className="px-4 lg:px-6 min-h-[600px] h-full">
          <SurveyDataInteractive data={surveys} />
        </div>
        <DataTable data={surveys} />
      </div>
    </div>
  );
}
