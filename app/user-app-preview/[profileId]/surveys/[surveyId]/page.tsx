import { notFound } from "next/navigation";

import SurveyMapCaller from "@/components/callers/survey-map-caller";
import { SurveyTimeline } from "@/components/survey-timeline";
import { getUserAppPreviewData } from "@/lib/admin/user-app-preview";
import { getUserAppPreviewSurveyTimeline } from "@/lib/surveys/timeline";
import { SurveyMapStoreProvider } from "@/providers/survey-map-store-provider";

export default async function PreviewSurveyPage({
  params,
}: {
  params: Promise<{ profileId: string; surveyId: string }>;
}) {
  const { profileId, surveyId } = await params;
  const preview = await getUserAppPreviewData(profileId);
  const survey = preview.surveys.find((item) => item.id === surveyId);
  if (preview.status !== "active" || !survey) notFound();
  const timeline = await getUserAppPreviewSurveyTimeline(profileId, surveyId);
  if (!timeline) notFound();

  return (
    <div className="@container/main flex h-full flex-1 flex-col gap-2">
      <SurveyTimeline
        currentSurveyId={survey.id}
        hrefBase={`/user-app-preview/${profileId}/surveys`}
        timeline={timeline}
      />
      <SurveyMapStoreProvider key={survey.id}>
        <SurveyMapCaller
          detectedObjects={preview.detectedObjects.filter(
            (item) => item.areaCode === surveyId,
          )}
          survey={survey}
        />
      </SurveyMapStoreProvider>
    </div>
  );
}
