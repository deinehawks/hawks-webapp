import { redirect } from "next/navigation";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
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
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type AdminCount = {
  label: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

type ClientListRow = Pick<
  Tables<"clients">,
  "id" | "code" | "name" | "classification_kind" | "created_at"
>;

type ProfileListRow = Pick<
  Tables<"profiles">,
  "id" | "email" | "role" | "account_role" | "organization_id" | "created_at"
>;

type SurveyListRow = Pick<
  Tables<"surveys">,
  "id" | "location" | "status" | "flight_date" | "client_id"
> & {
  client: Pick<Tables<"clients">, "code" | "name"> | null;
};

type OrganizationListRow = Pick<
  Tables<"organizations">,
  "id" | "name" | "code" | "type_code" | "status" | "created_at"
>;

type PeopleListRow = Pick<
  Tables<"people">,
  | "id"
  | "display_name"
  | "first_name"
  | "last_name"
  | "email"
  | "status"
  | "updated_at"
>;

type FarmListRow = Pick<
  Tables<"farms">,
  "id" | "name" | "code" | "crop" | "area_hectares" | "status"
>;

type MembershipListRow = Pick<
  Tables<"organization_memberships">,
  "id" | "profile_id" | "organization_id" | "role" | "status" | "updated_at"
>;

type OutputListRow = Pick<
  Tables<"survey_outputs">,
  "id" | "title" | "output_type" | "survey_id" | "status" | "is_current"
>;

type ListColumn<T> = {
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
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

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatShortId(value: string | null): string {
  return value ? value.slice(0, 8) : "Not set";
}

function formatLabel(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPersonName(person: PeopleListRow): string {
  if (person.display_name) {
    return person.display_name;
  }

  const name = [person.first_name, person.last_name].filter(Boolean).join(" ");
  return name || "Unnamed person";
}

function StatusBadge({ value }: { value: string | null }) {
  return <Badge variant="outline">{formatLabel(value)}</Badge>;
}

function DetailLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="font-medium text-primary hover:underline" href={href}>
      {children}
    </Link>
  );
}

function ReadOnlyTable<T extends { id: string }>({
  rows,
  columns,
  emptyLabel,
}: {
  rows: T[];
  columns: ListColumn<T>[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                className={`px-3 py-2 font-medium ${column.className ?? ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={`px-3 py-2 ${column.className ?? ""}`}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminListSection<T extends { id: string }>({
  title,
  description,
  rows,
  columns,
  emptyLabel,
}: {
  title: string;
  description: string;
  rows: T[];
  columns: ListColumn<T>[];
  emptyLabel: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge variant="secondary">{rows.length} shown</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ReadOnlyTable
          rows={rows}
          columns={columns}
          emptyLabel={emptyLabel}
        />
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [
    clients,
    profiles,
    surveys,
    organizations,
    people,
    farms,
    memberships,
    outputs,
    clientRows,
    profileRows,
    surveyRows,
    organizationRows,
    peopleRows,
    farmRows,
    membershipRows,
    outputRows,
  ] = await Promise.all([
    getTableCount("clients"),
    getTableCount("profiles"),
    getTableCount("surveys"),
    getTableCount("organizations"),
    getTableCount("people"),
    getTableCount("farms"),
    getTableCount("organization_memberships"),
    getTableCount("survey_outputs"),
    supabase
      .from("clients")
      .select("id, code, name, classification_kind, created_at")
      .order("code", { ascending: true })
      .limit(8),
    supabase
      .from("profiles")
      .select("id, email, role, account_role, organization_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("surveys")
      .select(
        "id, location, status, flight_date, client_id, client:clients!surveys_client_id_fkey(code, name)",
      )
      .order("flight_date", { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from("organizations")
      .select("id, name, code, type_code, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("people")
      .select(
        "id, display_name, first_name, last_name, email, status, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("farms")
      .select("id, name, code, crop, area_hectares, status")
      .order("name", { ascending: true })
      .limit(8),
    supabase
      .from("organization_memberships")
      .select("id, profile_id, organization_id, role, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("survey_outputs")
      .select("id, title, output_type, survey_id, status, is_current")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const listResponses = [
    ["legacy clients", clientRows],
    ["profiles", profileRows],
    ["surveys", surveyRows],
    ["organizations", organizationRows],
    ["people", peopleRows],
    ["farms", farmRows],
    ["memberships", membershipRows],
    ["outputs", outputRows],
  ] as const;

  for (const [label, response] of listResponses) {
    if (response.error) {
      throw new Error(`Failed to load ${label}.`, { cause: response.error });
    }
  }

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

  const clientList = (clientRows.data ?? []) as ClientListRow[];
  const profileList = (profileRows.data ?? []) as ProfileListRow[];
  const surveyList = (surveyRows.data ?? []) as SurveyListRow[];
  const organizationList = (organizationRows.data ?? []) as OrganizationListRow[];
  const peopleList = (peopleRows.data ?? []) as PeopleListRow[];
  const farmList = (farmRows.data ?? []) as FarmListRow[];
  const membershipList = (membershipRows.data ?? []) as MembershipListRow[];
  const outputList = (outputRows.data ?? []) as OutputListRow[];

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-normal">
            Admin Dashboard
          </h1>
          <Badge variant="secondary">Read-only lists</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Phase 3C adds platform-admin visibility into the current compatibility
          records and the empty domain foundation. Record creation, membership
          changes, asset migration, and destructive actions remain gated.
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

      <section className="grid gap-4">
        <AdminListSection
          title="Legacy Clients"
          description="Historical mixed tenant records"
          rows={clientList}
          emptyLabel="No legacy client records are visible."
          columns={[
            {
              header: "Code",
              cell: (row) => (
                <DetailLink href={`/dashboard/admin/clients/${row.id}`}>
                  {row.code}
                </DetailLink>
              ),
            },
            { header: "Name", cell: (row) => row.name ?? "Unnamed client" },
            {
              header: "Classification",
              cell: (row) => <StatusBadge value={row.classification_kind} />,
            },
            { header: "Created", cell: (row) => formatDate(row.created_at) },
          ]}
        />

        <AdminListSection
          title="User Accounts"
          description="Authenticated profiles and current access state"
          rows={profileList}
          emptyLabel="No profile records are visible."
          columns={[
            {
              header: "Email",
              cell: (row) => (
                <DetailLink href={`/dashboard/admin/profiles/${row.id}`}>
                  {row.email ?? "No email"}
                </DetailLink>
              ),
            },
            {
              header: "Legacy Role",
              cell: (row) => <StatusBadge value={row.role} />,
            },
            {
              header: "Account Role",
              cell: (row) => <StatusBadge value={row.account_role} />,
            },
            {
              header: "Organization",
              cell: (row) => formatShortId(row.organization_id),
            },
          ]}
        />

        <AdminListSection
          title="Surveys and Missions"
          description="Existing survey records still using compatible client ownership"
          rows={surveyList}
          emptyLabel="No survey records are visible."
          columns={[
            {
              header: "Survey",
              cell: (row) => (
                <DetailLink href={`/dashboard/admin/surveys/${row.id}`}>
                  {formatShortId(row.id)}
                </DetailLink>
              ),
            },
            {
              header: "Client",
              cell: (row) => row.client?.code ?? formatShortId(row.client_id),
            },
            { header: "Location", cell: (row) => row.location ?? "Not set" },
            {
              header: "Status",
              cell: (row) => <StatusBadge value={row.status} />,
            },
            { header: "Flight Date", cell: (row) => formatDate(row.flight_date) },
          ]}
        />

        <AdminListSection
          title="Organizations"
          description="Canonical organization records for future classified clients"
          rows={organizationList}
          emptyLabel="No canonical organizations yet. This is expected until reviewed mappings are created."
          columns={[
            {
              header: "Name",
              cell: (row) => (
                <DetailLink href={`/dashboard/admin/organizations/${row.id}`}>
                  {row.name}
                </DetailLink>
              ),
            },
            {
              header: "Type",
              cell: (row) => <StatusBadge value={row.type_code} />,
            },
            {
              header: "Status",
              cell: (row) => <StatusBadge value={row.status} />,
            },
            { header: "Code", cell: (row) => row.code ?? "Not set" },
          ]}
        />

        <AdminListSection
          title="Farmers and Contacts"
          description="Canonical people records independent from login accounts"
          rows={peopleList}
          emptyLabel="No canonical people yet. Farmers and contacts will be added only after reviewed mapping."
          columns={[
            {
              header: "Name",
              cell: (row) => (
                <DetailLink href={`/dashboard/admin/people/${row.id}`}>
                  {formatPersonName(row)}
                </DetailLink>
              ),
            },
            { header: "Email", cell: (row) => row.email ?? "Not set" },
            {
              header: "Status",
              cell: (row) => <StatusBadge value={row.status} />,
            },
            { header: "Updated", cell: (row) => formatDate(row.updated_at) },
          ]}
        />

        <AdminListSection
          title="Farms and Plantation Areas"
          description="Monitored land records separated from people and organizations"
          rows={farmList}
          emptyLabel="No farms or plantation areas yet. Survey-farm mapping is deferred until reviewed data exists."
          columns={[
            {
              header: "Name",
              cell: (row) => (
                <DetailLink href={`/dashboard/admin/farms/${row.id}`}>
                  {row.name}
                </DetailLink>
              ),
            },
            { header: "Code", cell: (row) => row.code ?? "Not set" },
            { header: "Crop", cell: (row) => formatLabel(row.crop) },
            {
              header: "Area",
              cell: (row) =>
                row.area_hectares == null
                  ? "Not set"
                  : `${row.area_hectares.toLocaleString()} ha`,
            },
            {
              header: "Status",
              cell: (row) => <StatusBadge value={row.status} />,
            },
          ]}
        />

        <AdminListSection
          title="Organization Memberships"
          description="Organization-scoped access records"
          rows={membershipList}
          emptyLabel="No organization memberships yet. Current access still works through compatible profile organization ownership."
          columns={[
            {
              header: "Profile",
              cell: (row) => (
                <DetailLink href={`/dashboard/admin/memberships/${row.id}`}>
                  {formatShortId(row.profile_id)}
                </DetailLink>
              ),
            },
            {
              header: "Organization",
              cell: (row) => formatShortId(row.organization_id),
            },
            { header: "Role", cell: (row) => <StatusBadge value={row.role} /> },
            {
              header: "Status",
              cell: (row) => <StatusBadge value={row.status} />,
            },
          ]}
        />

        <AdminListSection
          title="Outputs and Reports"
          description="Generic survey-linked output catalog"
          rows={outputList}
          emptyLabel="No generic output records yet. Existing orthos, point clouds, detections, and tiles remain compatible."
          columns={[
            {
              header: "Title",
              cell: (row) => (
                <DetailLink href={`/dashboard/admin/outputs/${row.id}`}>
                  {row.title ?? "Untitled output"}
                </DetailLink>
              ),
            },
            { header: "Type", cell: (row) => formatLabel(row.output_type) },
            { header: "Survey", cell: (row) => formatShortId(row.survey_id) },
            {
              header: "Status",
              cell: (row) => <StatusBadge value={row.status} />,
            },
            {
              header: "Current",
              cell: (row) => (row.is_current ? "Yes" : "No"),
            },
          ]}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-lg lg:col-span-2">
          <CardHeader>
            <CardDescription>Current Gate</CardDescription>
            <CardTitle>Phase 3C keeps admin data read-only</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The application remains backward compatible with existing
              clients, surveys, maps, detections, tile paths, and point clouds.
            </p>
            <p>
              The next reviewable step is a controlled classification workflow
              for legacy clients and domain records, still without destructive
              cleanup.
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
