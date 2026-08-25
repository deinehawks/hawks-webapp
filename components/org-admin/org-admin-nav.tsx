"use client";

import {
  Building2Icon,
  ChevronRightIcon,
  ClipboardListIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MapIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

const navigation = [
  { href: "/org-admin", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/org-admin/organization", label: "Organization", icon: Building2Icon },
  { href: "/org-admin/members", label: "Members", icon: UsersIcon },
  { href: "/org-admin/onboarding", label: "Onboarding", icon: UserPlusIcon },
  { href: "/org-admin/grants", label: "Access Grants", icon: KeyRoundIcon },
  { href: "/org-admin/farms", label: "Farms", icon: ClipboardListIcon },
  { href: "/org-admin/surveys", label: "Surveys", icon: MapIcon },
] as const;

export function OrgAdminNav({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();
  const isOrgAdminPath =
    pathname === "/org-admin" || pathname.startsWith("/org-admin/");

  return (
    <SidebarGroup>
      <SidebarMenu>
        <Collapsible
          asChild
          defaultOpen={isOrgAdminPath}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip="Organization Admin">
                <ShieldCheckIcon />
                <span>Organization Admin</span>
                <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p
                className="text-sidebar-foreground/70 truncate px-4 py-1 text-xs"
                title={organizationName}
              >
                {organizationName}
              </p>
              <SidebarMenuSub>
                {navigation.map(({ href, label, icon: Icon }) => {
                  const isActive =
                    pathname === href ||
                    (href !== "/org-admin" && pathname.startsWith(`${href}/`));

                  return (
                    <SidebarMenuSubItem key={href}>
                      <SidebarMenuSubButton isActive={isActive} asChild>
                        <Link href={href}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  );
}
