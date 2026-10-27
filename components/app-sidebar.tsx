import Image from "next/image";
import type { ComponentProps } from "react";
import type { User } from "@supabase/supabase-js";

import hawks_logo from "@/public/hawks/logo.png";
import hawks_typescript from "@/public/hawks/typescript.png";

import { DashboardNavLink } from "@/components/dashboard-nav-link";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
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

export function AppSidebar({ surveys, user, userProfile }: ComponentProps<typeof NavMain> & { user: User }) {
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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                  <div className="relative w-8">
                    <Image
                      src={hawks_logo}
                      alt="ASIMOV-HAWKS symbol"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                </div>
                <div className="relative w-[150px]">
                  <Image
                    src={hawks_typescript}
                    alt="ASIMOV-HAWKS"
                    style={{ width: "100%", height: "auto" }}
                  />
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Dashboard Button */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <DashboardNavLink />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <NavMain surveys={surveys} userProfile={userProfile} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
