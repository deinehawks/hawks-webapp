import Image from "next/image";
import Link from "next/link";
import { LayoutDashboardIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import hawksLogo from "@/public/hawks/logo.png";
import hawksTypescript from "@/public/hawks/typescript.png";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AdminSidebar({
  user,
}: {
  user: User;
}) {
  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:!p-1.5"
              asChild
            >
              <Link href="/admin" className="flex items-center justify-start">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                  <div className="relative w-8">
                    <Image
                      src={hawksLogo}
                      alt="ASIMOV-HAWKS logo"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                </div>
                <div className="relative w-[150px]">
                  <Image
                    src={hawksTypescript}
                    alt="ASIMOV-HAWKS wordmark"
                    style={{ width: "100%", height: "auto" }}
                  />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform Admin</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Admin Overview"
                className="transition-colors hover:bg-primary/10"
                asChild
              >
                <Link href="/admin">
                  <ShieldCheckIcon />
                  <span>Admin Overview</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="View User App"
                className="transition-colors hover:bg-primary/10"
                asChild
              >
                <Link href="/dashboard">
                  <LayoutDashboardIcon />
                  <span>View User App</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Current Wave</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Users & Access"
                className="transition-colors hover:bg-primary/10"
                asChild
              >
                <Link href="/admin/users">
                  <UsersIcon />
                  <span>Users &amp; Access</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
