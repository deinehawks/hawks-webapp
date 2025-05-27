"use client";

import {
  BarChartIcon,
  Building2Icon,
  ChevronRight,
  icons,
  LayoutDashboardIcon,
  LocateFixedIcon,
  MapIcon,
  SquareTerminalIcon,
  type LucideIcon,
} from "lucide-react";

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
import { Button } from "./ui/button";
import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const data = {
  navMain: [
    {
      title: "Areas",
      url: "#",
      icon: SquareTerminalIcon,
      isActive: true,
      items: [],
    },
  ],
};

export function NavMain({ surveys, userProfile }) {
  const params = useParams();
  const selectedSurvey = params.surveyId;

  const surveyIds = useMemo(() => {
    if (!surveys) return null;
    return surveys.map((survey) => survey.id);
  }, [surveys]);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Orthomap</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              isActive={params.plantation === userProfile.access_code}
              asChild
            >
              <Link href={`/dashboard/orthomap/${userProfile.access_code}`}>
                <Building2Icon />
                <span> {userProfile.access_code}</span>
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
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>

                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {surveyIds?.length > 0 && (
                    <SidebarMenuSub>
                      {surveyIds?.map((id) => (
                        <SidebarMenuSubItem key={id}>
                          <SidebarMenuSubButton
                            isActive={id === selectedSurvey}
                            asChild
                          >
                            <Link href={`/dashboard/surveys/${id}`}>
                              <span>{id}</span>
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
    </>
  );
}
