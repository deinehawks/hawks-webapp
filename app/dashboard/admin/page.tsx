import { redirect } from "next/navigation";
import type { ComponentType } from "react";
import {
  Building2,
  ClipboardList,
  Database,
  FileBarChart,
  Landmark,
  Map,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import { createClient } from "@/utils/supabase/server";

type AdminCount = {
  label: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

async function getTableCount(table: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(`Failed to load ${table} count.`, { cause: error });
  }

  return count ?? 0;
}

export default async function AdminPage() {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    redirect("/dashboard");
  }

  const [
    clients,
    profiles,
    surveys,
    organizations,
    people,
    farms,
    memberships,
    outputs,
  ] = await Promise.all([
    getTableCount("clients"),
    getTableCount("profiles"),
    getTableCount("surveys"),
    getTableCount("organizations"),
    getTableCount("people"),
    getTableCount("farms"),
    getTableCount("organization_memberships"),
    getTableCount("survey_outputs"),
  ]);

  const counts: AdminCount[] = [
    {
      label: "Legacy Clients",
      value: clients,
      description: "Mixed tenant records preserved for compatibility.",
      icon: Building2,
    },
    {
      label: "User Accounts",
      value: profiles,
      description: "Authenticated profiles and access state.",
      icon: Users,
    },
    {
      label: "Surveys",
      value: surveys,
      description: "Existing drone mission and survey records.",
      icon: Map,
    },
    {
      label: "Organizations",
      value: organizations,
      description: "Canonical organization records added in Phase 3A.",
      icon: Landmark,
    },
    {
      label: "People",
      value: people,
      description: "Canonical farmers, contacts, and stakeholders.",
      icon: Users,
    },
    {
      label: "Farms",
      value: farms,
      description: "Plantation areas and monitored land records.",
      icon: ClipboardList,
    },
    {
      label: "Memberships",
      value: memberships,
      description: "Organization-scoped account membership records.",
      icon: ShieldCheck,
    },
    {
      label: "Outputs",
      value: outputs,
      description: "Survey-linked output and report catalog records.",
      icon: FileBarChart,
    },
  ];

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-normal">
            Admin Dashboard
          </h1>
          <Badge variant="secondary">Read-only shell</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Phase 3B exposes a protected overview of the staging-ready domain
          foundation. Record creation, membership changes, asset migration, and
          destructive actions remain gated.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((item) => (
          <Card key={item.label} className="rounded-lg">
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardDescription>{item.label}</CardDescription>
                  <CardTitle className="text-3xl tabular-nums">
                    {item.value.toLocaleString()}
                  </CardTitle>
                </div>
                <item.icon className="mt-1 size-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-lg lg:col-span-2">
          <CardHeader>
            <CardDescription>Current Gate</CardDescription>
            <CardTitle>Phase 3B keeps admin access read-only</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The application remains backward compatible with existing
              clients, surveys, maps, detections, tile paths, and point clouds.
            </p>
            <p>
              The next reviewable step is to replace these summary cards with
              read-only list views for organizations, users, surveys, farms, and
              outputs.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardDescription>Blocked Actions</CardDescription>
            <CardTitle>Still pending review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Database className="size-4" />
              <span>No contract cleanup</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              <span>No member mutation</span>
            </div>
            <div className="flex items-center gap-2">
              <FileBarChart className="size-4" />
              <span>No asset migration</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
