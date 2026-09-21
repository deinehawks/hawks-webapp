"use client";

import { Badge } from "@/components/ui/badge";
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
import { Building2Icon, ListIcon, MapIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

function dateValue(value: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function NavMain({
  surveys,
  dashboardHref = "/dashboard",
  surveyHrefBase = "/dashboard/surveys",
  orthomapHrefBase = "/dashboard/orthomap",
}: {
  surveys: Survey[];
  dashboardHref?: string;
  surveyHrefBase?: string;
  orthomapHrefBase?: string;
}) {
  const params = useParams();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobileNavigation = () => {
    if (isMobile) setOpenMobile(false);
  };
  const selectedSurvey =
    typeof params.surveyId === "string"
      ? params.surveyId
      : Array.isArray(params.surveyId)
        ? params.surveyId[0]
        : undefined;
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

  const recentSurveys = useMemo(
    () =>
      [...surveys]
        .sort((left, right) => {
          const leftDate = dateValue(left.flight_date);
          const rightDate = dateValue(right.flight_date);
          if (leftDate == null && rightDate == null) {
            return String(left.id).localeCompare(String(right.id), undefined, {
              numeric: true,
            });
          }
          if (leftDate == null) return 1;
          if (rightDate == null) return -1;
          if (leftDate === rightDate) {
            return String(left.id).localeCompare(String(right.id), undefined, {
              numeric: true,
            });
          }
          return rightDate - leftDate;
        })
        .slice(0, 5),
    [surveys],
  );

  const newSurveyIds = useMemo(() => {
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
    return new Set(
      surveys
        .filter((survey) => {
          const timestamp = dateValue(survey.flight_date);
          return timestamp != null && timestamp > cutoff.getTime();
        })
        .map((survey) => String(survey.id)),
    );
  }, [surveys]);

  const surveyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const survey of surveys) {
      if (!survey.code) continue;
      counts.set(survey.code, (counts.get(survey.code) ?? 0) + 1);
    }
    return counts;
  }, [surveys]);

  return (
    <>
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

      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center justify-between">
          <span>Recent surveys</span>
          <Badge variant="secondary">{surveys.length}</Badge>
        </SidebarGroupLabel>
        <SidebarMenu>
          {recentSurveys.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className={sidebarNavigationButtonClass}
                tooltip="No accessible surveys"
              >
                <div aria-disabled="true" className="text-muted-foreground">
                  <MapIcon aria-hidden="true" />
                  <span>No accessible surveys</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            recentSurveys.map((survey) => {
              const surveyId = String(survey.id);
              return (
                <SidebarMenuItem key={surveyId}>
                  <SidebarMenuButton
                    asChild
                    className={sidebarNavigationButtonClass}
                    isActive={surveyId === selectedSurvey}
                    tooltip={surveyId}
                  >
                    <Link
                      aria-current={surveyId === selectedSurvey ? "page" : undefined}
                      href={surveyHrefBase + "/" + encodeURIComponent(surveyId)}
                      onClick={closeMobileNavigation}
                    >
                      <MapIcon aria-hidden="true" />
                      <span className="truncate">{surveyId}</span>
                    </Link>
                  </SidebarMenuButton>
                  {newSurveyIds.has(surveyId) ? (
                    <SidebarMenuBadge className="text-[10px]">NEW</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              );
            })
          )}

          {surveys.length > 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className={sidebarNavigationButtonClass}
                tooltip="View all surveys"
              >
                <Link
                  href={dashboardHref + "#survey-explorer"}
                  onClick={closeMobileNavigation}
                >
                  <ListIcon aria-hidden="true" />
                  <span>View all surveys</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
