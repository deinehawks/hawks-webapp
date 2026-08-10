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
import type { Survey, UserProfile } from "@/lib/types";

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
  userProfile,
}: {
  surveys: Survey[];
  userProfile: UserProfile;
}) {
  const params = useParams();
  const selectedSurvey = params.surveyId;
  const clientCode = userProfile.client?.code;
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
      if (!map[key]) map[key] = { total: 0, new: 0 };
      map[key].total += 1;
      if (isNew) map[key].new += 1;
    });
    return map;
  }, [surveys]);

  const surveyIds = useMemo(() => surveys?.map((s) => s.id) ?? [], [surveys]);
  const isLoading = !surveyIds.length;

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Orthomap</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={params.plantation === clientCode}
              asChild
              className="transition-colors hover:bg-primary/10"
            >
              <Link
                href={clientCode ? `/dashboard/orthomap/${clientCode}` : "/dashboard"}
                className="flex items-center gap-2 px-3 py-2 rounded"
              >
                <Building2Icon className="size-4" />
                <span className="font-medium">{clientCode ?? "Pending assignment"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
                    {clientCode && surveyCounts[clientCode] && (
                      <Badge variant="secondary" className="ml-auto flex gap-1">
                        {surveyCounts[clientCode].total}
                      </Badge>
                    )}
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  {isLoading ? (
                    <SidebarMenuSub>
                      {[1, 2, 3].map((i) => (
                        <SidebarMenuSubItem key={i}>
                          <div className="flex items-center gap-2 px-3 py-2 w-full">
                            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer w-full"></div>
                          </div>
                        </SidebarMenuSubItem>
                      ))}
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
                              href={`/dashboard/surveys/${id}`}
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
