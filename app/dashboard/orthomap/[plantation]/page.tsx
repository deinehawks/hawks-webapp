import OrthoMapCaller from "@/components/callers/ortho-map-caller";
import { getAccessibleClient } from "@/lib/actions/clients";
import { getCurrentUserProfile } from "@/lib/actions/profiles";
import {
  getAllUserSurveys,
  getObjectDetectionData,
} from "@/lib/actions/surveys";
import { AuthorizationError } from "@/lib/auth/user-context";
import { OrthoMapStoreProvider } from "@/providers/ortho-map-store-provider";

export default async function Page(props: { params: Promise<{ plantation: string }> }) {
  const { plantation } = await props.params;

  let client;
  try {
    client = await getAccessibleClient(plantation);
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;

    return (
      <div className="flex flex-1 items-center justify-center">
        No accessible data is available for plantation: {plantation}
      </div>
    );
  }

  const [userProfile, surveys, detectedObjects] = await Promise.all([
    getCurrentUserProfile(),
    getAllUserSurveys(client.id),
    getObjectDetectionData(undefined, client.id),
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 h-full">
      <OrthoMapStoreProvider>
        <OrthoMapCaller
          userProfile={userProfile}
          surveys={surveys}
          detectedObjects={detectedObjects}
        />
      </OrthoMapStoreProvider>
    </div>
  );
}
