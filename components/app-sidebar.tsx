import Image from "next/image";
import Link from "next/link";

import hawks_logo from "@/public/hawks/logo.png";
import hawks_typescript from "@/public/hawks/typescript.png";

import { HouseIcon, LayoutDashboardIcon, ShieldCheckIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Survey, UserProfile } from "@/lib/types";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
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

export function AppSidebar({
  surveys,
  user,
  userProfile,
}: {
  surveys: Survey[];
  user: User;
  userProfile: UserProfile;
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
              <div className="flex items-center justify-start">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                  <div className="relative w-8">
                    <Image
                      src={hawks_logo}
                      alt="Typescript logo of ASIMOV-HAWKS"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                </div>
                <div className="relative w-[150px]">
                  <Image
                    src={hawks_typescript}
                    alt="Typescript logo of ASIMOV-HAWKS"
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
            <SidebarMenuItem className="flex items-center gap-2">
              <SidebarMenuButton
                tooltip="Dashboard"
                className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                asChild
              >
                <Link href="/dashboard">
                  <LayoutDashboardIcon />
                  <span> Dashboard </span>
                </Link>
              </SidebarMenuButton>
              <Link href={`/`}>
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:opacity-0"
                  variant="outline"
                >
                  <HouseIcon />
                  <span className="sr-only"> Homepage </span>
                </Button>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <NavMain surveys={surveys} userProfile={userProfile} />
        {userProfile.role === "platform_admin" && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Admin"
                  className="transition-colors hover:bg-primary/10"
                  asChild
                >
                  <Link href="/admin">
                    <ShieldCheckIcon />
                    <span>Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
        {/* <NavAccount /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
