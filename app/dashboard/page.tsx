import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import SurveyDataInteractive from "@/components/survey-data-interactive";
import {
  getAllUserSurveys,
  getObjectDetectionData,
} from "@/lib/actions/surveys";

import { AppSidebar } from "@/components/app-sidebar";
import { HeaderBreadcrumb } from "@/components/header-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getUser } from "@/lib/actions/auth";
import { getUserProfile } from "@/lib/actions/profiles";

export default async function Page() {
  const user = await getUser();
  const userProfile = await getUserProfile(user?.id);
  const surveys = await getAllUserSurveys();
  const detectedObjects = await getObjectDetectionData();

  if (!surveys || !detectedObjects) return <div className="flex"></div>;

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards surveys={surveys} detectedObjects={detectedObjects} />
        <div className="px-4 lg:px-6">
          <SurveyDataInteractive data={surveys} />
        </div>
        <DataTable data={surveys} />
      </div>
    </div>
  );
}
