"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export const sidebarNavigationButtonClass = cn(
  "relative h-9 rounded-lg text-sidebar-foreground/80 transition-colors duration-150",
  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
  "data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:left-0",
  "data-[active=true]:before:w-0.5 data-[active=true]:before:rounded-full data-[active=true]:before:bg-sidebar-primary",
);

function matchesPath(pathname: string, href: string, exact: boolean) {
  const path = href.split("#", 1)[0] || "/";
  if (exact || path === "/") return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function SidebarNavLink({
  active,
  badge,
  exact = false,
  href,
  icon: Icon,
  label,
  className,
}: {
  active?: boolean;
  badge?: string | number;
  exact?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = active ?? matchesPath(pathname, href, exact);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={cn(sidebarNavigationButtonClass, className)}
        isActive={isActive}
        tooltip={label}
      >
        <Link
          aria-current={isActive ? "page" : undefined}
          href={href}
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
      {badge != null ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  );
}
