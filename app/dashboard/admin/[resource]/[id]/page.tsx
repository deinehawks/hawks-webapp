import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { PostgrestError } from "@supabase/supabase-js";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  confirmClientOrganizationMapping,
  confirmClientPersonMapping,
  createOrganizationForClientMapping,
  createPersonForClientMapping,
  updateClientClassification,
} from "@/lib/actions/admin-classification";
import { updateOrganizationMembershipStatus } from "@/lib/actions/admin-memberships";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Database, Json, Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type ResourceName =
  | "clients"
  | "profiles"
  | "surveys"
  | "organizations"
  | "people"
  | "farms"
  | "memberships"
  | "outputs";

type DetailField = {
  label: string;
  value: string | number | boolean | Json | null | undefined;
};

type ResourceDetail = {
  title: string;
  description: string;
  badge: string;
  fields: DetailField[];
  client?: ClientDetailRow;
  organizationOptions?: MappingOrganizationOption[];
  organizationTypeOptions?: MappingOrganizationTypeOption[];
  personOptions?: MappingPersonOption[];
  membership?: MembershipDetailRow;
};

type SurveyDetailRow = Tables<"surveys"> & {
  client: Pick<Tables<"clients">, "code" | "name"> | null;
};

type ClientMappedPerson = Pick<
  Tables<"people">,
  "id" | "display_name" | "first_name" | "last_name"
>;

type MappingOrganizationOption = Pick<
  Tables<"organizations">,
  "id" | "name" | "type_code" | "status"
>;

type MappingOrganizationTypeOption = Pick<
  Tables<"organization_types">,
  "code" | "label"
>;

type MappingPersonOption = Pick<
  Tables<"people">,
  "id" | "display_name" | "first_name" | "last_name" | "status"
>;

type MembershipProfileDetail = Pick<
  Tables<"profiles">,
  "id" | "email" | "role" | "account_role" | "person_id" | "organization_id"
>;

type MembershipOrganizationDetail = Pick<
  Tables<"organizations">,
  "id" | "name" | "type_code" | "status"
>;

type MembershipStatus = Database["public"]["Enums"]["membership_status"];

type MembershipDetailRow = Tables<"organization_memberships"> & {
  profile: MembershipProfileDetail | null;
  organization: MembershipOrganizationDetail | null;
};

type ClientDetailRow = Tables<"clients"> & {
  client_people:
    | (Pick<
        Tables<"client_people">,
        "is_primary" | "relationship_type" | "review_status"
      > & {
        person: ClientMappedPerson | null;
      })[]
    | null;
  client_organizations:
    | (Pick<
        Tables<"client_organizations">,
        "is_primary" | "relationship_type" | "review_status"
      > & {
        organization: Pick<
          Tables<"organizations">,
          "id" | "name" | "type_code"
        > | null;
      })[]
    | null;
};

const resourceLabels: Record<ResourceName, string> = {
  clients: "Legacy Client",
  profiles: "User Account",
  surveys: "Survey or Mission",
  organizations: "Organization",
  people: "Farmer or Contact",
  farms: "Farm or Plantation Area",
  memberships: "Organization Membership",
  outputs: "Output or Report",
};

function isResourceName(value: string): value is ResourceName {
  return value in resourceLabels;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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

function formatShortId(value: string | null): string {
  return value ? value.slice(0, 8) : "Not set";
}

function formatValue(value: DetailField["value"]): string {
  if (value == null) {
    return "Not set";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatPersonName(person: Tables<"people">): string {
  if (person.display_name) {
    return person.display_name;
  }

  const name = [person.first_name, person.last_name].filter(Boolean).join(" ");
  return name || "Unnamed person";
}

function formatMappedPersonName(person: ClientMappedPerson): string {
  if (person.display_name) {
    return person.display_name;
  }

  const name = [person.first_name, person.last_name].filter(Boolean).join(" ");
  return name || formatShortId(person.id);
}

function formatClientMappingState(client: ClientDetailRow): string {
  const organizationMappings = client.client_organizations ?? [];
  const personMappings = client.client_people ?? [];
  const confirmedOrganizations = organizationMappings.filter(
    (mapping) => mapping.review_status === "confirmed",
  );
  const confirmedPeople = personMappings.filter(
    (mapping) => mapping.review_status === "confirmed",
  );

  if (confirmedOrganizations.length > 0 && confirmedPeople.length > 0) {
    return "Review required: confirmed person and organization mappings both exist.";
  }

  if (client.classification_kind === "organization" && confirmedOrganizations.length === 0) {
    return "Review required: classified as organization without a confirmed organization mapping.";
  }

  if (client.classification_kind === "individual" && confirmedPeople.length === 0) {
    return "Review required: classified as individual without a confirmed person mapping.";
  }

  if (client.classification_kind === "unclassified") {
    return "Needs human classification review.";
  }

  return "Ready for the future controlled classification workflow.";
}

function formatClientOrganizationMappings(client: ClientDetailRow): string {
  const mappings = client.client_organizations ?? [];

  if (mappings.length === 0) {
    return "No organization mappings";
  }

  return mappings
    .map((mapping) => {
      const name = mapping.organization?.name ?? "Missing organization";
      const type = mapping.organization?.type_code
        ? formatLabel(mapping.organization.type_code)
        : "No type";
      const primary = mapping.is_primary ? "primary" : "secondary";

      return (
        name +
        " (" +
        type +
        ", " +
        formatLabel(mapping.review_status) +
        ", " +
        primary +
        ")"
      );
    })
    .join("; ");
}

function formatMembershipReadiness(membership: MembershipDetailRow): string {
  if (!membership.profile) {
    return "Review required: missing user account reference.";
  }

  if (!membership.organization) {
    return "Review required: missing organization reference.";
  }

  if (membership.status === "active") {
    return "Active membership. This is the intended organization access path.";
  }

  if (membership.status === "pending") {
    return "Pending approval. It should not be treated as active access.";
  }

  if (membership.status === "invited") {
    return "Invited membership. It needs acceptance or approval before active use.";
  }

  if (membership.status === "suspended") {
    return "Suspended membership. Access should remain blocked.";
  }

  if (membership.status === "removed") {
    return "Removed membership retained for review and audit history.";
  }

  return "Review membership state before enabling mutations.";
}

function formatClientPersonMappings(client: ClientDetailRow): string {
  const mappings = client.client_people ?? [];

  if (mappings.length === 0) {
    return "No person mappings";
  }

  return mappings
    .map((mapping) => {
      const name = mapping.person
        ? formatMappedPersonName(mapping.person)
        : "Missing person";
      const primary = mapping.is_primary ? "primary" : "secondary";

      return (
        name +
        " (" +
        formatLabel(mapping.review_status) +
        ", " +
        primary +
        ")"
      );
    })
    .join("; ");
}

async function getResourceDetail(
  resource: ResourceName,
  id: string,
): Promise<ResourceDetail | null> {
  const supabase = await createClient();

  switch (resource) {
    case "clients": {
      const { data, error } = (await supabase
        .from("clients")
        .select("*, client_people(is_primary, relationship_type, review_status, person:people(id, display_name, first_name, last_name)), client_organizations(is_primary, relationship_type, review_status, organization:organizations(id, name, type_code))")
        .eq("id", id)
        .maybeSingle()) as {
        data: ClientDetailRow | null;
        error: PostgrestError | null;
      };

      if (error) {
        throw new Error("Failed to load legacy client detail.", {
          cause: error,
        });
      }

      if (!data) return null;

      const [
        organizationsResponse,
        organizationTypesResponse,
        peopleResponse,
      ] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, type_code, status")
          .order("name", { ascending: true })
          .limit(100),
        supabase
          .from("organization_types")
          .select("code, label")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("people")
          .select("id, display_name, first_name, last_name, status")
          .order("display_name", { ascending: true, nullsFirst: false })
          .limit(100),
      ]);

      if (organizationsResponse.error) {
        throw new Error("Failed to load organization mapping options.", {
          cause: organizationsResponse.error,
        });
      }

      if (organizationTypesResponse.error) {
        throw new Error("Failed to load organization type options.", {
          cause: organizationTypesResponse.error,
        });
      }

      if (peopleResponse.error) {
        throw new Error("Failed to load person mapping options.", {
          cause: peopleResponse.error,
        });
      }

      return {
        title: data.name ?? data.code,
        description: "Mixed historical tenant record.",
        badge: formatLabel(data.classification_kind),
        client: data,
        organizationOptions:
          (organizationsResponse.data ?? []) as MappingOrganizationOption[],
        organizationTypeOptions:
          (organizationTypesResponse.data ?? []) as MappingOrganizationTypeOption[],
        personOptions: (peopleResponse.data ?? []) as MappingPersonOption[],
        fields: [
          { label: "ID", value: data.id },
          { label: "Code", value: data.code },
          { label: "Name", value: data.name },
          { label: "Classification", value: formatLabel(data.classification_kind) },
          { label: "Classification Notes", value: data.classification_notes },
          { label: "Classification Reviewed At", value: formatDate(data.classification_reviewed_at) },
          { label: "Mapping Readiness", value: formatClientMappingState(data) },
          { label: "Organization Mappings", value: formatClientOrganizationMappings(data) },
          { label: "Person Mappings", value: formatClientPersonMappings(data) },
          { label: "Created", value: formatDate(data.created_at) },
        ],
      };
    }

    case "profiles": {
      const { data, error } = (await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle()) as {
        data: Tables<"profiles"> | null;
        error: PostgrestError | null;
      };

      if (error) {
        throw new Error("Failed to load profile detail.", { cause: error });
      }

      if (!data) return null;

      const displayName =
        [data.first_name, data.last_name].filter(Boolean).join(" ") ||
        data.email ||
        formatShortId(data.id);

      return {
        title: displayName,
        description: "Authenticated application account.",
        badge: formatLabel(data.role),
        fields: [
          { label: "ID", value: data.id },
          { label: "Email", value: data.email },
          { label: "Legacy Role", value: formatLabel(data.role) },
          { label: "Account Role", value: formatLabel(data.account_role) },
          { label: "Organization ID", value: data.organization_id },
          { label: "Person ID", value: data.person_id },
          { label: "Mobile", value: data.mobile },
          { label: "Telephone", value: data.telephone },
          { label: "Created", value: formatDate(data.created_at) },
          { label: "Updated", value: formatDate(data.updated_at) },
        ],
      };
    }

    case "surveys": {
      const { data, error } = (await supabase
        .from("surveys")
        .select("*, client:clients!surveys_client_id_fkey(code, name)")
        .eq("id", id)
        .maybeSingle()) as {
        data: SurveyDetailRow | null;
        error: PostgrestError | null;
      };

      if (error) {
        throw new Error("Failed to load survey detail.", { cause: error });
      }

      if (!data) return null;

      const survey = data as unknown as SurveyDetailRow;

      return {
        title: survey.location ?? formatShortId(survey.id),
        description: "Existing mission and survey record.",
        badge: formatLabel(survey.status),
        fields: [
          { label: "ID", value: survey.id },
          { label: "Client", value: survey.client?.code ?? formatShortId(survey.client_id) },
          { label: "Client Name", value: survey.client?.name },
          { label: "Status", value: formatLabel(survey.status) },
          { label: "Flight Date", value: formatDate(survey.flight_date) },
          { label: "Location", value: survey.location },
          { label: "Area Code", value: survey.area_code },
          { label: "Area", value: survey.area },
          { label: "Type", value: survey.type },
          { label: "Category", value: survey.category },
          { label: "Created By", value: survey.created_by },
        ],
      };
    }

    case "organizations": {
      const { data, error } = (await supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .maybeSingle()) as {
        data: Tables<"organizations"> | null;
        error: PostgrestError | null;
      };

      if (error) {
        throw new Error("Failed to load organization detail.", { cause: error });
      }

      if (!data) return null;

      return {
        title: data.name,
        description: "Canonical organization record.",
        badge: formatLabel(data.type_code),
        fields: [
          { label: "ID", value: data.id },
          { label: "Code", value: data.code },
          { label: "Type", value: formatLabel(data.type_code) },
          { label: "Status", value: formatLabel(data.status) },
          { label: "Email", value: data.email },
          { label: "Mobile", value: data.mobile },
          { label: "Telephone", value: data.telephone },
          { label: "City", value: data.city },
          { label: "Province", value: data.province },
          { label: "Created", value: formatDate(data.created_at) },
          { label: "Updated", value: formatDate(data.updated_at) },
        ],
      };
    }

    case "people": {
      const { data, error } = (await supabase
        .from("people")
        .select("*")
        .eq("id", id)
        .maybeSingle()) as {
        data: Tables<"people"> | null;
        error: PostgrestError | null;
      };

      if (error) {
        throw new Error("Failed to load person detail.", { cause: error });
      }

      if (!data) return null;

      return {
        title: formatPersonName(data),
        description: "Canonical farmer, contact, or stakeholder record.",
        badge: formatLabel(data.status),
        fields: [
          { label: "ID", value: data.id },
          { label: "Display Name", value: data.display_name },
          { label: "First Name", value: data.first_name },
          { label: "Last Name", value: data.last_name },
          { label: "Email", value: data.email },
          { label: "Mobile", value: data.mobile },
          { label: "Telephone", value: data.telephone },
          { label: "Status", value: formatLabel(data.status) },
          { label: "Created", value: formatDate(data.created_at) },
          { label: "Updated", value: formatDate(data.updated_at) },
        ],
      };
    }

    case "farms": {
      const { data, error } = (await supabase
        .from("farms")
        .select("*")
        .eq("id", id)
        .maybeSingle()) as {
        data: Tables<"farms"> | null;
        error: PostgrestError | null;
      };

      if (error) {
        throw new Error("Failed to load farm detail.", { cause: error });
      }

      if (!data) return null;

      return {
        title: data.name,
        description: "Canonical farm or plantation area record.",
        badge: formatLabel(data.status),
        fields: [
          { label: "ID", value: data.id },
          { label: "Code", value: data.code },
          { label: "Crop", value: formatLabel(data.crop) },
          { label: "Area Hectares", value: data.area_hectares },
          { label: "Location", value: data.location_name },
          { label: "Status", value: formatLabel(data.status) },
          { label: "Notes", value: data.notes },
          { label: "Created", value: formatDate(data.created_at) },
          { label: "Updated", value: formatDate(data.updated_at) },
        ],
      };
    }

    case "memberships": {
      const { data, error } = (await supabase
        .from("organization_memberships")
        .select(
          "*, profile:profiles!organization_memberships_profile_id_fkey(id, email, role, account_role, person_id, organization_id), organization:organizations!organization_memberships_organization_id_fkey(id, name, type_code, status)",
        )
        .eq("id", id)
        .maybeSingle()) as {
        data: MembershipDetailRow | null;
        error: PostgrestError | null;
      };

      if (error) {
        throw new Error("Failed to load membership detail.", { cause: error });
      }

      if (!data) return null;

      return {
        title: data.profile?.email ?? formatShortId(data.profile_id),
        description: "Organization-scoped access record.",
        badge: formatLabel(data.status),
        membership: data,
        fields: [
          { label: "ID", value: data.id },
          { label: "User Email", value: data.profile?.email },
          { label: "Profile ID", value: data.profile_id },
          { label: "Legacy Profile Role", value: formatLabel(data.profile?.role ?? null) },
          { label: "Account Role", value: formatLabel(data.profile?.account_role ?? null) },
          { label: "Profile Person ID", value: data.profile?.person_id },
          { label: "Legacy Profile Organization ID", value: data.profile?.organization_id },
          { label: "Organization", value: data.organization?.name },
          { label: "Organization ID", value: data.organization_id },
          { label: "Organization Type", value: formatLabel(data.organization?.type_code ?? null) },
          { label: "Organization Status", value: formatLabel(data.organization?.status ?? null) },
          { label: "Membership Role", value: formatLabel(data.role) },
          { label: "Membership Status", value: formatLabel(data.status) },
          { label: "Readiness", value: formatMembershipReadiness(data) },
          { label: "Invited At", value: formatDate(data.invited_at) },
          { label: "Approved At", value: formatDate(data.approved_at) },
          { label: "Removed At", value: formatDate(data.removed_at) },
          { label: "Notes", value: data.notes },
          { label: "Created", value: formatDate(data.created_at) },
          { label: "Updated", value: formatDate(data.updated_at) },
        ],
      };
    }

    case "outputs": {
      const { data, error } = (await supabase
        .from("survey_outputs")
        .select("*")
        .eq("id", id)
        .maybeSingle()) as {
        data: Tables<"survey_outputs"> | null;
        error: PostgrestError | null;
      };

      if (error) {
        throw new Error("Failed to load output detail.", { cause: error });
      }

      if (!data) return null;

      return {
        title: data.title ?? "Untitled output",
        description: "Generic survey-linked output or report record.",
        badge: formatLabel(data.status),
        fields: [
          { label: "ID", value: data.id },
          { label: "Survey ID", value: data.survey_id },
          { label: "Type", value: formatLabel(data.output_type) },
          { label: "Status", value: formatLabel(data.status) },
          { label: "Current", value: data.is_current },
          { label: "Storage Bucket", value: data.storage_bucket },
          { label: "Storage Path", value: data.storage_path },
          { label: "Description", value: data.description },
          { label: "Metadata", value: data.metadata },
          { label: "Created", value: formatDate(data.created_at) },
          { label: "Updated", value: formatDate(data.updated_at) },
        ],
      };
    }
  }
}

function formatMappingPersonOption(person: MappingPersonOption): string {
  if (person.display_name) {
    return person.display_name;
  }

  const name = [person.first_name, person.last_name].filter(Boolean).join(" ");
  return name || formatShortId(person.id);
}

function ClientClassificationForm({ client }: { client: ClientDetailRow }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardDescription>Phase 3F Controlled Mutation</CardDescription>
        <CardTitle>Classify legacy client</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updateClientClassification} className="grid gap-4">
          <input name="clientId" type="hidden" value={client.id} />

          <div className="grid gap-2">
            <label
              className="text-sm font-medium"
              htmlFor="classificationKind"
            >
              Classification
            </label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:max-w-sm"
              defaultValue={client.classification_kind}
              id="classificationKind"
              name="classificationKind"
            >
              <option value="unclassified">Unclassified</option>
              <option value="organization">Organization</option>
              <option value="individual">Individual</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium"
              htmlFor="classificationNotes"
            >
              Review notes
            </label>
            <textarea
              className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              defaultValue={client.classification_notes ?? ""}
              id="classificationNotes"
              maxLength={2000}
              name="classificationNotes"
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm text-muted-foreground">
              This updates only the legacy client classification fields. It does
              not create people, organizations, memberships, farms, or canonical
              mapping rows.
            </p>
            <Button className="w-fit" type="submit">
              Save classification
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const membershipStatusTransitions = {
  invited: ["pending", "removed"],
  pending: ["active", "removed"],
  active: ["suspended", "removed"],
  suspended: ["active", "removed"],
  removed: [],
} as const satisfies Record<MembershipStatus, readonly MembershipStatus[]>;

function ClientMappingForm({
  client,
  organizationOptions,
  organizationTypeOptions,
  personOptions,
}: {
  client: ClientDetailRow;
  organizationOptions: MappingOrganizationOption[];
  organizationTypeOptions: MappingOrganizationTypeOption[];
  personOptions: MappingPersonOption[];
}) {
  const hasConfirmedOrganizationMapping = (client.client_organizations ?? [])
    .some((mapping) => mapping.review_status === "confirmed");
  const hasConfirmedPersonMapping = (client.client_people ?? []).some(
    (mapping) => mapping.review_status === "confirmed",
  );
  const organizationMappingDisabled = hasConfirmedPersonMapping;
  const personMappingDisabled = hasConfirmedOrganizationMapping;

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardDescription>Phase 3G-C Controlled Mapping</CardDescription>
        <CardTitle>Map to canonical record</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        {organizationMappingDisabled || personMappingDisabled ? (
          <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground lg:col-span-2">
            This legacy client already has a confirmed canonical mapping. A
            client can be mapped to either one organization or one person during
            this phase, not both.
          </p>
        ) : null}

        <form action={createOrganizationForClientMapping} className="grid gap-4 rounded-md border p-4">
          <input name="clientId" type="hidden" value={client.id} />
          <div>
            <h3 className="text-sm font-medium">Create organization</h3>
            <p className="text-sm text-muted-foreground">
              Use this when the cooperative, association, company, or partner is
              not in the existing organization list yet.
            </p>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="organizationName">
              Organization name
            </label>
            <input
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="organizationName"
              maxLength={200}
              name="organizationName"
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="organizationTypeCode">
              Organization type
            </label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="organizationTypeCode"
              name="organizationTypeCode"
              required
            >
              {organizationTypeOptions.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="organizationCode">
              Organization code
            </label>
            <input
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="organizationCode"
              maxLength={80}
              name="organizationCode"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="newOrganizationNotes">
              Organization notes
            </label>
            <textarea
              className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="newOrganizationNotes"
              maxLength={2000}
              name="organizationNotes"
              rows={3}
            />
          </div>
          <Button
            className="w-fit"
            disabled={
              organizationMappingDisabled ||
              organizationTypeOptions.length === 0
            }
            type="submit"
          >
            Create and map organization
          </Button>
        </form>

        <form action={createPersonForClientMapping} className="grid gap-4 rounded-md border p-4">
          <input name="clientId" type="hidden" value={client.id} />
          <div>
            <h3 className="text-sm font-medium">Create person</h3>
            <p className="text-sm text-muted-foreground">
              Use this for an individual farmer, owner, representative, or
              contact who is not in the existing people list yet.
            </p>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="personDisplayName">
              Display name
            </label>
            <input
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="personDisplayName"
              maxLength={200}
              name="personDisplayName"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="personFirstName">
                First name
              </label>
              <input
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                id="personFirstName"
                maxLength={120}
                name="personFirstName"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="personLastName">
                Last name
              </label>
              <input
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                id="personLastName"
                maxLength={120}
                name="personLastName"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="personMobile">
              Mobile
            </label>
            <input
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="personMobile"
              maxLength={80}
              name="personMobile"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="newPersonNotes">
              Person notes
            </label>
            <textarea
              className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="newPersonNotes"
              maxLength={2000}
              name="personNotes"
              rows={3}
            />
          </div>
          <Button
            className="w-fit"
            disabled={personMappingDisabled}
            type="submit"
          >
            Create and map person
          </Button>
        </form>

        <form action={confirmClientOrganizationMapping} className="grid gap-4">
          <input name="clientId" type="hidden" value={client.id} />
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="organizationId">
              Existing organization
            </label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={
                organizationOptions.length === 0 || organizationMappingDisabled
              }
              id="organizationId"
              name="organizationId"
              required
            >
              <option value="">
                {organizationOptions.length === 0
                  ? "No organizations available yet"
                  : "Select organization"}
              </option>
              {organizationOptions.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} ({formatLabel(organization.type_code)})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="organizationMappingNotes">
              Mapping notes
            </label>
            <textarea
              className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="organizationMappingNotes"
              maxLength={2000}
              name="mappingNotes"
              rows={3}
            />
          </div>
          {organizationOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create a canonical organization before mapping this legacy client.
            </p>
          ) : null}
          <Button
            className="w-fit"
            disabled={
              organizationOptions.length === 0 || organizationMappingDisabled
            }
            type="submit"
          >
            Confirm organization mapping
          </Button>
        </form>

        <form action={confirmClientPersonMapping} className="grid gap-4">
          <input name="clientId" type="hidden" value={client.id} />
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="personId">
              Existing person
            </label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={personOptions.length === 0 || personMappingDisabled}
              id="personId"
              name="personId"
              required
            >
              <option value="">
                {personOptions.length === 0
                  ? "No people available yet"
                  : "Select person"}
              </option>
              {personOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {formatMappingPersonOption(person)} ({formatLabel(person.status)})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="personMappingNotes">
              Mapping notes
            </label>
            <textarea
              className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="personMappingNotes"
              maxLength={2000}
              name="mappingNotes"
              rows={3}
            />
          </div>
          {personOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create a canonical person before mapping this legacy client.
            </p>
          ) : null}
          <Button
            className="w-fit"
            disabled={personOptions.length === 0 || personMappingDisabled}
            type="submit"
          >
            Confirm person mapping
          </Button>
        </form>

        <p className="text-sm text-muted-foreground lg:col-span-2">
          These actions only confirm mappings to existing canonical records. If
          the dropdowns are empty, create the canonical person or organization
          first. Conflicting confirmed mappings are rejected and every mapping
          write is audited.
        </p>
      </CardContent>
    </Card>
  );
}

function MembershipStatusForm({
  membership,
}: {
  membership: MembershipDetailRow;
}) {
  const nextStatuses = membershipStatusTransitions[membership.status];

  if (membership.role !== "member") {
    return (
      <Card className="rounded-lg">
        <CardHeader>
          <CardDescription>Phase 3H-C Controlled Membership</CardDescription>
          <CardTitle>Membership status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Org-admin membership role changes are deferred. This phase only
            manages ordinary member status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardDescription>Phase 3H-C Controlled Membership</CardDescription>
        <CardTitle>Update ordinary member status</CardTitle>
      </CardHeader>
      <CardContent>
        {nextStatuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Removed memberships are retained for audit history and cannot be
            reactivated from this phase.
          </p>
        ) : (
          <form
            action={updateOrganizationMembershipStatus}
            className="grid gap-4 lg:grid-cols-2"
          >
            <input name="membershipId" type="hidden" value={membership.id} />

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="nextStatus">
                Next status
              </label>
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                id="nextStatus"
                name="nextStatus"
                required
              >
                {nextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 lg:col-span-2">
              <label className="text-sm font-medium" htmlFor="membershipNotes">
                Status notes
              </label>
              <textarea
                className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                defaultValue={membership.notes ?? ""}
                id="membershipNotes"
                maxLength={2000}
                name="membershipNotes"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm text-muted-foreground">
                This changes only ordinary membership status. It does not create
                auth users, promote org admins, move users across organizations,
                or delete records.
              </p>
              <Button className="w-fit" type="submit">
                Update status
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AdminDetailPage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") {
    redirect("/dashboard");
  }

  const { resource, id } = await params;

  if (!isResourceName(resource)) {
    notFound();
  }

  const detail = await getResourceDetail(resource, id);

  if (!detail) {
    notFound();
  }

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link href="/dashboard/admin">
            <ArrowLeft />
            Admin
          </Link>
        </Button>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal">
              {detail.title}
            </h1>
            <Badge variant="secondary">{resourceLabels[resource]}</Badge>
            <Badge variant="outline">{detail.badge}</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {detail.description} Most admin detail data remains read-only.
            Legacy client classification, canonical client mapping, and
            ordinary membership status updates are the only controlled
            mutations enabled here.
          </p>
        </div>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardDescription>Record Details</CardDescription>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-muted-foreground" />
            Platform-admin visibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-0 overflow-hidden rounded-md border sm:grid-cols-2">
            {detail.fields.map((field) => (
              <div
                key={field.label}
                className="border-b p-4 last:border-b-0 sm:border-r sm:even:border-r-0"
              >
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="mt-1 break-words text-sm">
                  {formatValue(field.value)}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {detail.client ? <ClientClassificationForm client={detail.client} /> : null}

      {detail.membership ? (
        <MembershipStatusForm membership={detail.membership} />
      ) : null}

      {detail.client ? (
        <ClientMappingForm
          client={detail.client}
          organizationOptions={detail.organizationOptions ?? []}
          organizationTypeOptions={detail.organizationTypeOptions ?? []}
          personOptions={detail.personOptions ?? []}
        />
      ) : null}
    </main>
  );
}
