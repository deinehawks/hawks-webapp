"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { isAfter, subMonths } from "date-fns";
import {
  Building2Icon,
  ChevronRight,
  ClipboardCheckIcon,
  SquareTerminalIcon,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
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

type NavSurvey = {
  id: string;
  code: string;
  created_at?: string | null;
  flight_date?: string | null;
  client: { name: string } | null;
};

type NavProfile = { role?: string | null } | null;

function isRecentSurvey(survey: NavSurvey, threshold: Date) {
  const rawDate = survey.created_at ?? survey.flight_date;
  if (!rawDate) return false;
  const date = new Date(rawDate);
  return !Number.isNaN(date.getTime()) && isAfter(date, threshold);
}

export function NavMain({
  surveys,
  userProfile,
}: {
  surveys: NavSurvey[];
  userProfile?: NavProfile;
}) {
  const params = useParams();
  const selectedSurvey = typeof params.surveyId === "string" ? params.surveyId : undefined;
  const selectedPlantation = typeof params.plantation === "string" ? params.plantation : undefined;
  const isPlatformAdmin = userProfile?.role === "platform_admin";
  const sixMonthsAgo = subMonths(new Date(), 6);

  const sortedSurveys = useMemo(
    () => [...surveys].sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id)),
    [surveys],
  );
  const codes = useMemo(
    () => [...new Set(sortedSurveys.map((survey) => survey.code).filter(Boolean))],
    [sortedSurveys],
  );

  return (
    <>
      {isPlatformAdmin && (
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/recording">
                  <ClipboardCheckIcon />
                  <span>Recording checklist</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      )}

      <SidebarGroup>
        <SidebarGroupLabel>Orthomap</SidebarGroupLabel>
        <SidebarMenu>
          {codes.map((code) => (
            <SidebarMenuItem key={code}>
              <SidebarMenuButton
                isActive={selectedPlantation === code}
                asChild
                className="transition-colors hover:bg-primary/10"
              >
                <Link
                  href={`/dashboard/orthomap/${encodeURIComponent(code)}`}
                  className="flex items-center gap-2 rounded px-3 py-2"
                >
                  <Building2Icon className="size-4" />
                  <span className="font-medium">{code}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Survey Data</SidebarGroupLabel>
        <SidebarMenu>
          <Collapsible asChild defaultOpen className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton className="flex items-center gap-2 rounded px-3 py-2 transition-colors hover:bg-primary/10">
                  <SquareTerminalIcon className="size-4" />
                  <span className="font-medium">Areas</span>
                  <Badge variant="secondary" className="ml-auto">
                    {sortedSurveys.length}
                  </Badge>
                  <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <SidebarMenuSub>
                  {codes.map((code) => (
                    <Fragment key={code}>
                      {codes.length > 1 && (
                        <SidebarMenuSubItem>
                          <span className="block px-3 py-1 text-xs font-semibold text-muted-foreground">
                            {code}
                          </span>
                        </SidebarMenuSubItem>
                      )}
                      {sortedSurveys
                        .filter((survey) => survey.code === code)
                        .map((survey, index) => (
                          <SidebarMenuSubItem
                            key={survey.id}
                            className="animate-fadeIn"
                            style={{
                              animationDelay: `${index * 50}ms`,
                              animationFillMode: "backwards",
                            }}
                          >
                            <SidebarMenuSubButton
                              isActive={survey.id === selectedSurvey}
                              asChild
                              className="rounded px-3 py-2 transition-colors hover:bg-primary/10"
                            >
                              <Link
                                href={`/dashboard/surveys/${encodeURIComponent(survey.id)}`}
                                className="flex items-center gap-2"
                              >
                                <span>{survey.id}</span>
                                {isRecentSurvey(survey, sixMonthsAgo) && (
                                  <Badge variant="secondary" className="ml-auto">
                                    NEW
                                  </Badge>
                                )}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                    </Fragment>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarGroup>

      {!sortedSurveys.length && (
        <p className="px-4 py-2 text-sm text-muted-foreground">
          No surveys have been assigned to this account.
        </p>
      )}

      <style jsx>{`
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

        :global(.animate-fadeIn) {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
