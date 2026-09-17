import SurveyMapCaller from "@/components/callers/survey-map-caller";
import { SurveyTimeline } from "@/components/survey-timeline";
import {
  getObjectDetectionData,
  getUserSurvey,
} from "@/lib/actions/surveys";
import { getAccessibleSurveyTimeline } from "@/lib/surveys/timeline";
import { SurveyMapStoreProvider } from "@/providers/survey-map-store-provider";

export default async function Page({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  const survey = await getUserSurvey(surveyId);
  const [detectedObjects, timeline] = await Promise.all([
    getObjectDetectionData(surveyId, survey.client_id ?? undefined),
    getAccessibleSurveyTimeline(survey),
  ]);

  if (!survey) {
    return (
      <div className="flex flex-1 items-center justify-center ">
        Survey not found.
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 h-full">
      <SurveyTimeline
        currentSurveyId={survey.id}
        hrefBase="/dashboard/surveys"
        timeline={timeline}
      />
      <SurveyMapStoreProvider key={survey.id}>
        <SurveyMapCaller survey={survey} detectedObjects={detectedObjects} />
      </SurveyMapStoreProvider>
    </div>
  );
}
