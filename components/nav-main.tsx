"use client";

import { sidebarNavigationButtonClass } from "@/components/sidebar-nav-link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Survey } from "@/lib/types";
import { Building2Icon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export function NavMain({
  surveys,
  dashboardHref = "/dashboard",
  orthomapHrefBase = "/dashboard/orthomap",
}: {
  surveys: Survey[];
  dashboardHref?: string;
  orthomapHrefBase?: string;
}) {
  const params = useParams();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobileNavigation = () => {
    if (isMobile) setOpenMobile(false);
  };
  const plantationParam =
    typeof params.plantation === "string"
      ? params.plantation
      : Array.isArray(params.plantation)
        ? params.plantation[0]
        : undefined;

  const clientCodes = useMemo(
    () => [...new Set(surveys.map((survey) => survey.client.code).filter(Boolean))],
    [surveys],
  );

  const surveyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const survey of surveys) {
      if (!survey.code) continue;
      counts.set(survey.code, (counts.get(survey.code) ?? 0) + 1);
    }
    return counts;
  }, [surveys]);

  return (
      <SidebarGroup>
        <SidebarGroupLabel>Orthomaps</SidebarGroupLabel>
        <SidebarMenu>
          {clientCodes.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className={sidebarNavigationButtonClass}
                tooltip="No accessible orthomaps"
              >
                <Link href={dashboardHref} onClick={closeMobileNavigation}>
                  <Building2Icon aria-hidden="true" />
                  <span>No accessible orthomaps</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            clientCodes.map((clientCode) => (
              <SidebarMenuItem key={clientCode}>
                <SidebarMenuButton
                  asChild
                  className={sidebarNavigationButtonClass}
                  isActive={plantationParam === clientCode}
                  tooltip={clientCode}
                >
                  <Link
                    aria-current={plantationParam === clientCode ? "page" : undefined}
                    href={orthomapHrefBase + "/" + encodeURIComponent(clientCode)}
                    onClick={closeMobileNavigation}
                  >
                    <Building2Icon aria-hidden="true" />
                    <span>{clientCode}</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuBadge>{surveyCounts.get(clientCode) ?? 0}</SidebarMenuBadge>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroup>
  );
}
