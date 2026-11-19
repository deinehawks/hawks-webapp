import { UserSurveyExplorer } from "@/components/user-survey-explorer";
import {
  getAllUserSurveys,
  getObjectDetectionData,
} from "@/lib/actions/surveys";

export default async function SurveyExplorerPage() {
  const surveys = await getAllUserSurveys();
  const detectedObjects = await getObjectDetectionData();

  return (
    <UserSurveyExplorer
      detectedObjects={detectedObjects}
      surveys={surveys}
    />
  );
}
