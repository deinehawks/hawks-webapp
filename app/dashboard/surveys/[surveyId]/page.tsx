import SurveyMapCaller from "@/components/callers/survey-map-caller";
import { getUserSurvey } from "@/lib/actions/survey";
import { getObjectDetectionData } from "@/lib/actions/surveys";
import { SurveyMapStoreProvider } from "@/providers/survey-map-store-provider";
import { notFound } from "next/navigation";

export default async function Page(props: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await props.params;
  const survey = await getUserSurvey(surveyId);
  if (!survey) {
    notFound();
  }
  const detectedObjects = await getObjectDetectionData(surveyId);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 h-full">
      <SurveyMapStoreProvider>
        <SurveyMapCaller survey={survey} detectedObjects={detectedObjects} />
      </SurveyMapStoreProvider>
    </div>
  );
}
