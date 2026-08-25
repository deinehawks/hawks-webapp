import { AppSidebar } from "@/components/app-sidebar";
import { HeaderBreadcrumb } from "@/components/header-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getAllUserSurveys } from "@/lib/actions/surveys";
import { getOrgAdminContext } from "@/lib/org-admin/context";

export default async function OrgAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, profile, organization } = await getOrgAdminContext();
  const surveys = await getAllUserSurveys();

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        surveys={surveys}
        user={user}
        userProfile={profile}
        orgAdminOrganizationName={organization.name}
      />
      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-4" />
            <HeaderBreadcrumb />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

