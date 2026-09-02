import Image from "next/image";
import Link from "next/link";
import { Eye, LayoutDashboardIcon, LogOutIcon, UserRound } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Survey, UserProfile } from "@/lib/types";
import hawksLogo from "@/public/hawks/logo.png";
import hawksWordmark from "@/public/hawks/typescript.png";

function displayName(profile: UserProfile) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.email || "Selected user";
}

export function UserAppPreviewSidebar({
  profile,
  profileId,
  surveys,
}: {
  profile: UserProfile;
  profileId: string;
  surveys: Survey[];
}) {
  const base = `/user-app-preview/${profileId}`;

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:!p-1.5"
              asChild
            >
              <div className="flex items-center justify-start">
                <div className="flex aspect-square size-8 items-center justify-center">
                  <Image src={hawksLogo} alt="ASIMOV-HAWKS logo" className="h-auto w-8" />
                </div>
                <Image src={hawksWordmark} alt="ASIMOV-HAWKS" className="h-auto w-[150px]" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Dashboard preview"
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                asChild
              >
                <Link href={base}>
                  <LayoutDashboardIcon />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <NavMain
          dashboardHref={base}
          orthomapHrefBase={`${base}/orthomap`}
          surveyHrefBase={`${base}/surveys`}
          surveys={surveys}
        />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <Eye className="size-4 shrink-0" />
              <span>Read-only preview</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-2">
              <UserRound className="size-4 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{displayName(profile)}</p>
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Exit preview" asChild>
              <Link href={`/admin/users/${profileId}`}>
                <LogOutIcon />
                <span>Exit preview</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
