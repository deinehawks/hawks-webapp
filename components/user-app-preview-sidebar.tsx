"use client";

import { Eye, LayoutDashboardIcon, LogOutIcon, UserRound } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { SidebarBrand } from "@/components/sidebar-brand";
import {
  sidebarNavigationButtonClass,
  SidebarNavLink,
} from "@/components/sidebar-nav-link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Survey, UserProfile } from "@/lib/types";

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
    <Sidebar collapsible="icon" variant="inset">
      <SidebarBrand href={base} />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarNavLink
              exact
              href={base}
              icon={LayoutDashboardIcon}
              label="Dashboard"
            />
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
            <SidebarMenuButton
              asChild
              className={sidebarNavigationButtonClass}
              tooltip="Read-only preview"
            >
              <div className="text-muted-foreground">
                <Eye aria-hidden="true" />
                <span>Read-only preview</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-12 rounded-lg group-data-[collapsible=icon]:justify-center"
              size="lg"
              tooltip={displayName(profile)}
            >
              <div>
                <UserRound aria-hidden="true" />
                <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-sm font-medium">{displayName(profile)}</p>
                  <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarNavLink
            active={false}
            href={`/admin/users/${profileId}`}
            icon={LogOutIcon}
            label="Exit preview"
          />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
