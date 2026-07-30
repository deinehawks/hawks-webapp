import { redirect } from "next/navigation";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  FileBarChart,
  Landmark,
  Map,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createOrganizationMembership } from "@/lib/actions/admin-memberships";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type AdminCount = {
  label: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

type ClientPersonMappingRow = Pick<
  Tables<"client_people">,
  "is_primary" | "relationship_type" | "review_status"
> & {
  person: Pick<
    Tables<"people">,
    "id" | "display_name" | "first_name" | "last_name"
  > | null;
};

type ClientOrganizationMappingRow = Pick<
  Tables<"client_organizations">,
  "is_primary" | "relationship_type" | "review_status"
> & {
  organization: Pick<Tables<"organizations">, "id" | "name" | "type_code"> | null;
};

type ClientListRow = Pick<
  Tables<"clients">,
  "id" | "code" | "name" | "classification_kind" | "created_at"
> & {
  client_people: ClientPersonMappingRow[] | null;
  client_organizations: ClientOrganizationMappingRow[] | null;
};

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

type MembershipProfileRow = Pick<
  Tables<"profiles">,
  "id" | "email" | "role" | "account_role"
>;

type MembershipOrganizationRow = Pick<
  Tables<"organizations">,
  "id" | "name" | "type_code" | "status"
>;

type MembershipProfileOption = MembershipProfileRow;
type MembershipOrganizationOption = MembershipOrganizationRow;

type MembershipListRow = Pick<
  Tables<"organization_memberships">,
  | "id"
  | "profile_id"
  | "organization_id"
  | "role"
  | "status"
  | "invited_at"
  | "approved_at"
  | "removed_at"
  | "updated_at"
> & {
  profile: MembershipProfileRow | null;
  organization: MembershipOrganizationRow | null;
};

type OutputListRow = Pick<
  Tables<"survey_outputs">,
  "id" | "title" | "output_type" | "survey_id" | "status" | "is_current"
>;

type ListColumn<T> = {
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
};

type ReadinessMetric = {
  label: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  variant?: "default" | "warning";
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

function formatMappedPerson(
  person: ClientPersonMappingRow["person"],
): string {
  if (!person) {
    return "Missing person";
  }

  if (person.display_name) {
    return person.display_name;
  }

  const name = [person.first_name, person.last_name].filter(Boolean).join(" ");
  return name || formatShortId(person.id);
}

function getReviewedMappingLabel(client: ClientListRow): string {
  const organizationMappings = client.client_organizations ?? [];
  const personMappings = client.client_people ?? [];
  const confirmedOrganizations = organizationMappings.filter(
    (mapping) => mapping.review_status === "confirmed",
  );
  const confirmedPeople = personMappings.filter(
    (mapping) => mapping.review_status === "confirmed",
  );

  if (confirmedOrganizations.length > 0 && confirmedPeople.length > 0) {
    return "Conflicting confirmed mappings";
  }

  const primaryOrganization =
    confirmedOrganizations.find((mapping) => mapping.is_primary) ??
    confirmedOrganizations[0];
  const primaryPerson =
    confirmedPeople.find((mapping) => mapping.is_primary) ?? confirmedPeople[0];

  if (primaryOrganization?.organization) {
    return (
      primaryOrganization.organization.name +
      " (" +
      formatLabel(primaryOrganization.organization.type_code) +
      ")"
    );
  }

  if (primaryPerson?.person) {
    return formatMappedPerson(primaryPerson.person);
  }

  if (client.classification_kind === "organization") {
    return "Missing organization mapping";
  }

  if (client.classification_kind === "individual") {
    return "Missing person mapping";
  }

  return "Needs review";
}

function formatMembershipReadiness(row: MembershipListRow): string {
  if (!row.profile) {
    return "Review required: missing user account.";
  }

  if (!row.organization) {
    return "Review required: missing organization.";
  }

  if (row.status === "active") {
    return "Active access path.";
  }

  if (row.status === "pending") {
    return "Pending approval; no active organization access yet.";
  }

  if (row.status === "invited") {
    return "Invited; waiting for acceptance or approval.";
  }

  if (row.status === "suspended") {
    return "Suspended; access should remain blocked.";
  }

  if (row.status === "removed") {
    return "Removed membership; kept for audit history.";
  }

  return "Review membership status.";
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

function CreateMembershipForm({
  profileOptions,
  organizationOptions,
}: {
  profileOptions: MembershipProfileOption[];
  organizationOptions: MembershipOrganizationOption[];
}) {
  const disabled = profileOptions.length === 0 || organizationOptions.length === 0;

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardDescription>Phase 3H-B Controlled Membership</CardDescription>
        <CardTitle>Create ordinary member access</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createOrganizationMembership} className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="profileId">
              Existing user account
            </label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={disabled}
              id="profileId"
              name="profileId"
              required
            >
              <option value="">
                {profileOptions.length === 0 ? "No eligible users" : "Select user"}
              </option>
              {profileOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.email ?? formatShortId(option.id)} ({formatLabel(option.account_role)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="organizationId">
              Existing organization
            </label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={disabled}
              id="organizationId"
              name="organizationId"
              required
            >
              <option value="">
                {organizationOptions.length === 0 ? "No organizations" : "Select organization"}
              </option>
              {organizationOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} ({formatLabel(option.type_code)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="status">
              Initial status
            </label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              defaultValue="pending"
              disabled={disabled}
              id="status"
              name="status"
              required
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
            </select>
          </div>

          <div className="grid gap-2 lg:row-span-2">
            <label className="text-sm font-medium" htmlFor="membershipNotes">
              Notes
            </label>
            <textarea
              className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="membershipNotes"
              maxLength={2000}
              name="membershipNotes"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-3 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-3xl text-sm text-muted-foreground">
              This creates only an ordinary organization member record for an
              existing user and existing organization. Organization-admin
              promotion, Auth-user creation, invite email delivery, and
              destructive removal workflows remain blocked.
            </p>
            <Button className="w-fit" disabled={disabled} type="submit">
              Create membership
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ReadinessCard({ metric }: { metric: ReadinessMetric }) {
  const isWarning = metric.variant === "warning";
  const iconClassName = isWarning
    ? "mt-1 size-5 text-amber-600"
    : "mt-1 size-5 text-muted-foreground";

  return (
    <Card className="rounded-lg">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardDescription>{metric.label}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {metric.value.toLocaleString()}
            </CardTitle>
          </div>
          <metric.icon className={iconClassName} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{metric.description}</p>
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
    unclassifiedClients,
    reviewedClients,
    confirmedPersonMappings,
    confirmedOrganizationMappings,
    clientRows,
    profileRows,
    surveyRows,
    organizationRows,
    peopleRows,
    farmRows,
    membershipRows,
    outputRows,
    membershipProfileOptionsResponse,
    membershipOrganizationOptionsResponse,
    liveMembershipProfileIdsResponse,
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
      .select("*", { count: "exact", head: true })
      .eq("classification_kind", "unclassified"),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .neq("classification_kind", "unclassified"),
    supabase
      .from("client_people")
      .select("*", { count: "exact", head: true })
      .eq("review_status", "confirmed"),
    supabase
      .from("client_organizations")
      .select("*", { count: "exact", head: true })
      .eq("review_status", "confirmed"),
    supabase
      .from("clients")
      .select("id, code, name, classification_kind, created_at, client_people(is_primary, relationship_type, review_status, person:people(id, display_name, first_name, last_name)), client_organizations(is_primary, relationship_type, review_status, organization:organizations(id, name, type_code))")
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
      .select(
        "id, profile_id, organization_id, role, status, invited_at, approved_at, removed_at, updated_at, profile:profiles!organization_memberships_profile_id_fkey(id, email, role, account_role), organization:organizations!organization_memberships_organization_id_fkey(id, name, type_code, status)",
      )
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("survey_outputs")
      .select("id, title, output_type, survey_id, status, is_current")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("profiles")
      .select("id, email, role, account_role")
      .neq("role", "platform_admin")
      .neq("account_role", "platform_admin")
      .order("email", { ascending: true, nullsFirst: false })
      .limit(100),
    supabase
      .from("organizations")
      .select("id, name, type_code, status")
      .eq("status", "active")
      .order("name", { ascending: true })
      .limit(100),
    supabase
      .from("organization_memberships")
      .select("profile_id")
      .in("status", ["invited", "pending", "active", "suspended"])
      .limit(1000),
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
    ["unclassified client count", unclassifiedClients],
    ["reviewed client count", reviewedClients],
    ["confirmed person mappings count", confirmedPersonMappings],
    ["confirmed organization mappings count", confirmedOrganizationMappings],
    ["membership profile options", membershipProfileOptionsResponse],
    ["membership organization options", membershipOrganizationOptionsResponse],
    ["live membership profile ids", liveMembershipProfileIdsResponse],
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
  const liveMembershipProfileIds = new Set(
    ((liveMembershipProfileIdsResponse.data ?? []) as Pick<
      Tables<"organization_memberships">,
      "profile_id"
    >[]).map((row) => row.profile_id),
  );
  const membershipProfileOptions = ((membershipProfileOptionsResponse.data ?? []) as MembershipProfileOption[])
    .filter((option) => !liveMembershipProfileIds.has(option.id));
  const membershipOrganizationOptions = (membershipOrganizationOptionsResponse.data ?? []) as MembershipOrganizationOption[];
  const readinessMetrics: ReadinessMetric[] = [
    {
      label: "Unclassified Clients",
      value: unclassifiedClients.count ?? 0,
      description: "Legacy tenant records still waiting for human review.",
      icon: TriangleAlert,
      variant: "warning",
    },
    {
      label: "Reviewed Clients",
      value: reviewedClients.count ?? 0,
      description: "Clients marked as organization, individual, or other.",
      icon: CheckCircle2,
    },
    {
      label: "Person Mappings",
      value: confirmedPersonMappings.count ?? 0,
      description: "Confirmed legacy-client links to canonical people.",
      icon: Users,
    },
    {
      label: "Organization Mappings",
      value: confirmedOrganizationMappings.count ?? 0,
      description: "Confirmed legacy-client links to canonical organizations.",
      icon: Landmark,
    },
  ];

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-normal">
            Admin Dashboard
          </h1>
          <Badge variant="secondary">Controlled membership</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Phase 3H-B enables platform admins to create ordinary member
          access for existing users and existing organizations. Phase 3H-C
          adds ordinary membership status management. Org-admin promotion,
          Auth-user creation, invite delivery, asset migration, and destructive
          actions remain gated.
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {readinessMetrics.map((metric) => (
          <ReadinessCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4">
        <CreateMembershipForm
          profileOptions={membershipProfileOptions}
          organizationOptions={membershipOrganizationOptions}
        />

        <AdminListSection
          title="Legacy Clients"
          description="Historical mixed tenant records with reviewed canonical mapping status"
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
            {
              header: "Canonical Mapping",
              cell: (row) => getReviewedMappingLabel(row),
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
          description="Read-only account-to-organization access readiness"
          rows={membershipList}
          emptyLabel="No organization memberships yet. Current access still works through compatible profile organization ownership."
          columns={[
            {
              header: "User Account",
              cell: (row) => (
                <DetailLink href={`/dashboard/admin/memberships/${row.id}`}>
                  {row.profile?.email ?? formatShortId(row.profile_id)}
                </DetailLink>
              ),
            },
            {
              header: "Organization",
              cell: (row) => row.organization?.name ?? formatShortId(row.organization_id),
            },
            {
              header: "Org Type",
              cell: (row) => <StatusBadge value={row.organization?.type_code ?? null} />,
            },
            { header: "Membership Role", cell: (row) => <StatusBadge value={row.role} /> },
            {
              header: "Status",
              cell: (row) => <StatusBadge value={row.status} />,
            },
            { header: "Readiness", cell: (row) => formatMembershipReadiness(row) },
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
            <CardTitle>Phase 3H-C adds ordinary member status control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The application remains backward compatible with existing
              clients, surveys, maps, detections, tile paths, and point clouds.
            </p>
            <p>
              Current controlled mutations cover legacy-client classification,
              canonical client mapping, ordinary membership creation, and
              ordinary membership status updates with audit coverage.
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
              <span>No org-admin promotion or destructive removal</span>
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
