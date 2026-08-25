import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { LayoutDashboardIcon } from "lucide-react";

import { NavUser } from "@/components/nav-user";
import { OrgAdminNav } from "@/components/org-admin/org-admin-nav";
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
import hawksLogo from "@/public/hawks/logo.png";
import hawksTypescript from "@/public/hawks/typescript.png";

export function OrgAdminSidebar({
  user,
  organizationName,
}: {
  user: User;
  organizationName: string;
}) {
  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="!p-1.5" asChild>
              <Link href="/org-admin">
                <Image src={hawksLogo} alt="ASIMOV-HAWKS logo" className="size-8" />
                <Image
                  src={hawksTypescript}
                  alt="ASIMOV-HAWKS"
                  className="h-auto w-[150px]"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Dashboard" asChild>
                <Link href="/dashboard">
                  <LayoutDashboardIcon />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <OrgAdminNav organizationName={organizationName} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
