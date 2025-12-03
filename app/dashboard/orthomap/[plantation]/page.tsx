import OrthoMapCaller from "@/components/callers/ortho-map-caller";

import { getAllClients } from "@/lib/actions/clients";
import { getCurrentUserProfile } from "@/lib/actions/profiles";
import {
  getAllUserSurveys,
  getObjectDetectionData,
} from "@/lib/actions/surveys";
import { OrthoMapStoreProvider } from "@/providers/ortho-map-store-provider";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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

  // Get authenticated user
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const userProfile = await getCurrentUserProfile();
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
