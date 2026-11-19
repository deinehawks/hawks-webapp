"use client";

import {
  Building2Icon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ClipboardPlusIcon,
  FileBarChartIcon,
  LayoutDashboardIcon,
  MapIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { NavUser } from "@/components/nav-user";
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

export function AdminSidebar({
  user,
}: {
  user: User;
}) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarBrand href="/admin" />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarNavLink
              exact
              href="/admin"
              icon={ShieldCheckIcon}
              label="Admin Overview"
            />
            <SidebarNavLink
              href="/dashboard"
              icon={LayoutDashboardIcon}
              label="View User App"
            />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Access</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarNavLink href="/admin/users" icon={UsersIcon} label="Users & Access" />
            <SidebarNavLink
              href="/admin/signup-approvals"
              icon={UserPlusIcon}
              label="Signup Approvals"
            />
            <SidebarNavLink
              href="/admin/onboarding-requests"
              icon={ClipboardCheckIcon}
              label="Organization Onboarding"
            />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Data Management</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarNavLink
              href="/admin/organizations"
              icon={Building2Icon}
              label="Organizations"
            />
            <SidebarNavLink href="/admin/farms" icon={ClipboardListIcon} label="Farms" />
            <SidebarNavLink href="/admin/surveys" icon={MapIcon} label="Surveys" />
            <SidebarNavLink
              href="/admin/dataset-onboarding"
              icon={ClipboardPlusIcon}
              label="Dataset Onboarding"
            />
            <SidebarNavLink
              href="/admin/outputs"
              icon={FileBarChartIcon}
              label="Outputs"
            />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
