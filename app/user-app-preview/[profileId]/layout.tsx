import Link from "next/link";
import { Eye, ShieldCheck } from "lucide-react";

import { UserAppPreviewSidebar } from "@/components/user-app-preview-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getUserAppPreviewData } from "@/lib/admin/user-app-preview";

function displayName(profile: {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.email || "Selected user";
}

export default async function UserAppPreviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const preview = await getUserAppPreviewData(profileId);

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 16)",
      } as React.CSSProperties}
    >
      <UserAppPreviewSidebar
        profile={preview.profile}
        profileId={profileId}
        surveys={preview.surveys}
      />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex min-h-(--header-height) shrink-0 items-center border-b bg-background/95 backdrop-blur">
          <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="-ml-1 shrink-0" />
              <Separator orientation="vertical" className="h-5" />
              <Eye className="size-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">User App Preview</p>
                  <Badge variant="outline">Read only</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  Viewing {displayName(preview.profile)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/access-preview/${profileId}`}>Access calculation</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={`/admin/users/${profileId}`}>Exit preview</Link>
              </Button>
            </div>
            <div className="flex basis-full items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0" />
              The platform-admin session is unchanged and preview data is target-scoped.
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
