import OrthoMapCaller from "@/components/callers/ortho-map-caller";
import { getAllUserSurveys, getObjectDetectionData } from "@/lib/actions/surveys";
import { OrthoMapStoreProvider } from "@/providers/ortho-map-store-provider";

export default async function Page({ params }: { params: Promise<{ plantation: string }> }) {
  const { plantation } = await params;
  const surveys = await getAllUserSurveys(plantation);
  if (!surveys.length) return <p className="p-6">No selected surveys for this client.</p>;
  const detectedObjects = await getObjectDetectionData(undefined, plantation);
  return <div className="@container/main flex flex-1 flex-col gap-2 h-full">
    <OrthoMapStoreProvider><OrthoMapCaller surveys={surveys} detectedObjects={detectedObjects} /></OrthoMapStoreProvider>
  </div>;
}
