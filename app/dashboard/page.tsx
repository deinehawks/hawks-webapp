import { UserDashboardOverview } from "@/components/user-dashboard-overview";
import {
  getAllUserSurveys,
  getObjectDetectionData,
} from "@/lib/actions/surveys";

export default async function Page() {
  const surveys = await getAllUserSurveys();
  const detectedObjects = await getObjectDetectionData();
  return <UserDashboardOverview surveys={surveys} detectedObjects={detectedObjects} />;
}
