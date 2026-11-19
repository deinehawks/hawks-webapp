import OrthoMapCaller from "@/components/callers/ortho-map-caller";
import { getUserAppPreviewData } from "@/lib/admin/user-app-preview";
import { OrthoMapStoreProvider } from "@/providers/ortho-map-store-provider";

export default async function PreviewOrthomapPage({
  params,
}: {
  params: Promise<{ profileId: string; plantation: string }>;
}) {
  const { profileId, plantation } = await params;
  const preview = await getUserAppPreviewData(profileId);
  const surveys = preview.surveys.filter(
    (survey) => survey.client.code === plantation,
  );
  const surveyIds = new Set(surveys.map((survey) => survey.id));

  if (preview.status !== "active" || surveys.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        This orthomap is not available in the selected user&apos;s preview.
      </div>
    );
  }

  return (
    <div className="@container/main flex h-full flex-1 flex-col gap-2">
      <OrthoMapStoreProvider>
        <OrthoMapCaller
          detectedObjects={preview.detectedObjects.filter(
            (item) => surveyIds.has(item.areaCode),
          )}
          surveys={surveys}
          userProfile={preview.profile}
        />
      </OrthoMapStoreProvider>
    </div>
  );
}
