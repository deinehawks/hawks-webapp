import OrthoMapCaller from "@/components/callers/ortho-map-caller";

import { getUser } from "@/lib/actions/auth";
import { getAllClients } from "@/lib/actions/clients";
import { getUserProfile } from "@/lib/actions/profiles";
import {
  getAllUserSurveys,
  getObjectDetectionData,
} from "@/lib/actions/surveys";
import { OrthoMapStoreProvider } from "@/providers/ortho-map-store-provider";

export default async function Page(props: { params: { plantation: string } }) {
  const { plantation } = await props.params;

  const clients = await getAllClients();

  const clientsList = clients.map((client) => client.code);

  if (!clientsList.includes(plantation)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        No data available for plantation: {plantation}
      </div>
    );
  }

  const user = await getUser();
  const userProfile = await getUserProfile(user?.id);
  const surveys = await getAllUserSurveys();
  const detectedObjects = await getObjectDetectionData();

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
