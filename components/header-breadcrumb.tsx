"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderBreadcrumb() {
  const pathname = usePathname();
  const paths = pathname.split("/").filter(Boolean);
  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    surveys: "Surveys",
    orthomap: "Orthomap",
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {paths.map((path, i) => {
          if (i < paths.length - 1)
            return (
              <React.Fragment key={i}>
                <BreadcrumbItem className="hidden md:block">
                  {i === 0 && path === "dashboard" ? (
                    <BreadcrumbLink asChild>
                      <Link href="/dashboard" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        Dashboard
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <span>{labels[path] ?? path}</span>
                  )}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </React.Fragment>
            );

          if (i === paths.length - 1)
            return (
              <BreadcrumbItem key={i}>
                <BreadcrumbPage className="break-all">{labels[path] ?? path}</BreadcrumbPage>
              </BreadcrumbItem>
            );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
