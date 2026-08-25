import { AppSidebar } from "@/components/app-sidebar";
import { HeaderBreadcrumb } from "@/components/header-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getAllUserSurveys } from "@/lib/actions/surveys";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import { resolveOrgAdminAccess } from "@/lib/org-admin/access";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, profile } = await getAuthenticatedUserContext();
  if (profile.account_status && profile.account_status !== "active") {
    redirect("/account/pending");
  }
  const [surveys, orgAdminAccess] = await Promise.all([
    getAllUserSurveys(),
    profile.role === "user"
      ? resolveOrgAdminAccess(user.id)
      : Promise.resolve({ status: "none" } as const),
  ]);

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
        orgAdminOrganizationName={
          orgAdminAccess.status === "active"
            ? orgAdminAccess.organization.name
            : undefined
        }
      />
      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
            <HeaderBreadcrumb />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
