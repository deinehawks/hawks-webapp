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
import { usePathname } from "next/navigation";

export function HeaderBreadcrumb() {
  const pathname = usePathname();
  const paths = pathname.split("/");

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {paths.map((path, i) => {
          if (i > 0 && i < paths.length - 1)
            return (
              <React.Fragment key={i}>
                <BreadcrumbItem className="hidden md:block">
                  <span className="capitalize">{path}</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </React.Fragment>
            );

          if (i === paths.length - 1)
            return (
              <BreadcrumbItem key={i}>
                <BreadcrumbPage className="capitalize"> {path} </BreadcrumbPage>
              </BreadcrumbItem>
            );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
