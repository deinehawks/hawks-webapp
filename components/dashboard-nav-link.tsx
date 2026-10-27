"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function DashboardNavLink() {
  const isActive = usePathname() === "/dashboard";

  return (
    <SidebarMenuButton
      tooltip="Dashboard"
      isActive={isActive}
      className="h-11 sm:h-9"
      asChild
    >
      <Link href="/dashboard" aria-current={isActive ? "page" : undefined}>
        <LayoutDashboardIcon aria-hidden="true" />
        <span>Dashboard</span>
      </Link>
    </SidebarMenuButton>
  );
}
