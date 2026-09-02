import { notFound } from "next/navigation";

import SurveyMapCaller from "@/components/callers/survey-map-caller";
import { getUserAppPreviewData } from "@/lib/admin/user-app-preview";
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

  return (
    <div className="@container/main flex h-full flex-1 flex-col gap-2">
      <SurveyMapStoreProvider>
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
