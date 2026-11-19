import { UserDashboardOverview } from "@/components/user-dashboard-overview";
import {
  getAllUserSurveys,
  getObjectDetectionData,
} from "@/lib/actions/surveys";
import { getWorkshopDemoCountMultipliers } from "@/lib/workshop-visibility";

export default async function Page() {
  const surveys = await getAllUserSurveys();
  const detectedObjects = await getObjectDetectionData();
  const demoCountMultipliers = getWorkshopDemoCountMultipliers(surveys);

  return (
    <UserDashboardOverview
      surveys={surveys}
      detectedObjects={detectedObjects}
      demoCountMultipliers={demoCountMultipliers}
    />
  );
}
