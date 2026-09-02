"use client";

import { Building2Icon, ChevronRight, SquareTerminalIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import { Badge } from "./ui/badge";
import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { isAfter, subMonths } from "date-fns";
import type { Survey } from "@/lib/types";

const data = {
  navMain: [
    {
      title: "Areas",
      url: "#",
      icon: SquareTerminalIcon,
      isActive: true,
    },
  ],
};

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
  const selectedSurvey = params.surveyId;
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
  const sixMonthsAgo = useMemo(() => subMonths(new Date(), 6), []);

  const surveyNewMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    surveys?.forEach((s) => {
      map[s.id] = s.flight_date
        ? isAfter(new Date(s.flight_date), sixMonthsAgo)
        : false;
    });
    return map;
  }, [surveys, sixMonthsAgo]);

  const surveyCounts = useMemo(() => {
    const map: Record<string, { total: number; new: number }> = {};
    if (!surveys) return map;
    surveys.forEach((s) => {
      const key = s.code;
      const isNew = s.flight_date
        ? isAfter(new Date(s.flight_date), subMonths(new Date(), 3))
        : false;
      if (!key) return;
      if (!map[key]) map[key] = { total: 0, new: 0 };
      map[key].total += 1;
      if (isNew) map[key].new += 1;
    });
    return map;
  }, [surveys]);

  const surveyIds = useMemo(() => surveys?.map((s) => s.id) ?? [], [surveys]);
  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Orthomap</SidebarGroupLabel>
        <SidebarMenu>
          {clientCodes.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="transition-colors hover:bg-primary/10">
                <Link href={dashboardHref} className="flex items-center gap-2 px-3 py-2 rounded">
                  <Building2Icon className="size-4" />
                  <span className="font-medium">No accessible orthomaps</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : clientCodes.map((clientCode) => (
            <SidebarMenuItem key={clientCode}>
              <SidebarMenuButton
                isActive={plantationParam === clientCode}
                asChild
                className="transition-colors hover:bg-primary/10"
              >
                <Link
                  href={`${orthomapHrefBase}/${clientCode}`}
                  className="flex items-center gap-2 px-3 py-2 rounded"
                >
                  <Building2Icon className="size-4" />
                  <span className="font-medium">{clientCode}</span>
                  {surveyCounts[clientCode] ? (
                    <Badge variant="secondary" className="ml-auto">
                      {surveyCounts[clientCode].total}
                    </Badge>
                  ) : null}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Survey Data</SidebarGroupLabel>
        <SidebarMenu>
          {data.navMain.map((item) => (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className="flex items-center gap-2 px-3 py-2 rounded transition-colors hover:bg-primary/10"
                  >
                    {item.icon && <item.icon className="size-4" />}
                    <span className="font-medium">{item.title}</span>
                    <Badge variant="secondary" className="ml-auto flex gap-1">
                      {surveyIds.length}
                    </Badge>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  {surveyIds.length === 0 ? (
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          No accessible surveys
                        </div>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  ) : (
                    <SidebarMenuSub>
                      {surveyIds.map((id, index) => (
                        <SidebarMenuSubItem
                          key={id}
                          className="animate-fadeIn"
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animationFillMode: "backwards",
                          }}
                        >
                          <SidebarMenuSubButton
                            isActive={id === selectedSurvey}
                            asChild
                            className="transition-colors hover:bg-primary/10 rounded px-3 py-2 flex items-center justify-between"
                          >
                            <Link
                              href={`${surveyHrefBase}/${id}`}
                              className="flex items-center gap-2"
                            >
                              <span>{id}</span>
                              {surveyNewMap[id] && (
                                <Badge variant="secondary" className="ml-auto">
                                  NEW
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        :global(.animate-shimmer) {
          animation: shimmer 1.5s ease-in-out infinite;
          background-size: 200% 100%;
        }

        :global(.animate-fadeIn) {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
