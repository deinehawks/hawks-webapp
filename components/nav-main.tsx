"use client";

import { Badge } from "@/components/ui/badge";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Survey } from "@/lib/types";
import { Building2Icon, ListIcon } from "lucide-react";
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
        <SidebarGroupLabel>Orthomap</SidebarGroupLabel>
        <SidebarMenu>
          {clientCodes.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="transition-colors hover:bg-primary/10">
                <Link href={dashboardHref}>
                  <Building2Icon aria-hidden="true" />
                  <span>No accessible orthomaps</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            clientCodes.map((clientCode) => (
              <SidebarMenuItem key={clientCode}>
                <SidebarMenuButton
                  isActive={plantationParam === clientCode}
                  asChild
                  className="transition-colors hover:bg-primary/10"
                >
                  <Link href={orthomapHrefBase + "/" + encodeURIComponent(clientCode)}>
                    <Building2Icon aria-hidden="true" />
                    <span className="font-medium">{clientCode}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {surveyCounts.get(clientCode) ?? 0}
                    </Badge>
                  </Link>
                </SidebarMenuButton>
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
              <p className="px-2 py-2 text-xs text-muted-foreground">
                No accessible surveys
              </p>
            </SidebarMenuItem>
          ) : (
            recentSurveys.map((survey) => {
              const surveyId = String(survey.id);
              return (
                <SidebarMenuItem key={surveyId}>
                  <SidebarMenuButton
                    isActive={surveyId === selectedSurvey}
                    asChild
                    className="transition-colors hover:bg-primary/10"
                  >
                    <Link href={surveyHrefBase + "/" + encodeURIComponent(surveyId)}>
                      <span className="truncate">{surveyId}</span>
                      {newSurveyIds.has(surveyId) ? (
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          NEW
                        </Badge>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })
          )}

          {surveys.length > 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="transition-colors hover:bg-primary/10">
                <Link href={dashboardHref + "#survey-explorer"}>
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
