import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  Building2Icon,
  ClipboardListIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MapIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";

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
import hawksLogo from "@/public/hawks/logo.png";
import hawksTypescript from "@/public/hawks/typescript.png";

const navigation = [
  { href: "/org-admin", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/org-admin/organization", label: "Organization", icon: Building2Icon },
  { href: "/org-admin/members", label: "Members", icon: UsersIcon },
  { href: "/org-admin/onboarding", label: "Onboarding", icon: UserPlusIcon },
  { href: "/org-admin/grants", label: "Access Grants", icon: KeyRoundIcon },
  { href: "/org-admin/farms", label: "Farms", icon: ClipboardListIcon },
  { href: "/org-admin/surveys", label: "Surveys", icon: MapIcon },
] as const;

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
          <SidebarGroupLabel className="truncate" title={organizationName}>
            {organizationName}
          </SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton tooltip={label} asChild>
                  <Link href={href}>
                    <Icon />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
