"use client";

import { LayoutDashboardIcon, ListIcon, ShieldCheckIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Survey, UserProfile } from "@/lib/types";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { OrgAdminNav } from "@/components/org-admin/org-admin-nav";
import { SidebarBrand } from "@/components/sidebar-brand";
import { SidebarNavLink } from "@/components/sidebar-nav-link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({
  surveys,
  user,
  userProfile,
  orgAdminOrganizationName,
}: {
  surveys: Survey[];
  user: User;
  userProfile: UserProfile;
  orgAdminOrganizationName?: string;
}) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarBrand href="/dashboard" />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarNavLink
              exact
              href="/dashboard"
              icon={LayoutDashboardIcon}
              label="Dashboard"
            />
            <SidebarNavLink
              href="/dashboard/surveys"
              icon={ListIcon}
              label="Surveys"
            />
          </SidebarMenu>
        </SidebarGroup>
        <NavMain surveys={surveys} />
        {orgAdminOrganizationName ? (
          <OrgAdminNav organizationName={orgAdminOrganizationName} />
        ) : null}
        {userProfile.role === "platform_admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarNavLink
                href="/admin"
                icon={ShieldCheckIcon}
                label="Platform Admin"
              />
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
