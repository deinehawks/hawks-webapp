"use client";

import Image from "next/image";
import Link from "next/link";

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import hawksLogo from "@/public/hawks/logo.png";
import hawksWordmark from "@/public/hawks/typescript.png";

export function SidebarBrand({ href }: { href: string }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarHeader className="pb-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            className="h-11 rounded-lg px-1.5 group-data-[collapsible=icon]:justify-center"
            size="lg"
            tooltip="ASIMOV-HAWKS"
          >
            <Link
              aria-label="ASIMOV-HAWKS home"
              href={href}
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
            >
              <span className="flex size-8 shrink-0 items-center justify-center">
                <Image
                  alt="ASIMOV-HAWKS logo"
                  className="h-auto w-8"
                  priority
                  src={hawksLogo}
                />
              </span>
              <Image
                alt="ASIMOV-HAWKS"
                className="h-auto w-[150px] group-data-[collapsible=icon]:hidden"
                priority
                src={hawksWordmark}
              />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
