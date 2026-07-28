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
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Json, Tables } from "@/lib/database.types";
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
};

type SurveyDetailRow = Tables<"surveys"> & {
  client: Pick<Tables<"clients">, "code" | "name"> | null;
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

async function getResourceDetail(
  resource: ResourceName,
  id: string,
): Promise<ResourceDetail | null> {
  const supabase = await createClient();

  switch (resource) {
    case "clients": {
      const { data, error } = (await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .maybeSingle()) as {
        data: Tables<"clients"> | null;
        error: PostgrestError | null;
      };

      if (error) {
        throw new Error("Failed to load legacy client detail.", {
          cause: error,
        });
      }

      if (!data) return null;

      return {
        title: data.name ?? data.code,
        description: "Mixed historical tenant record.",
        badge: formatLabel(data.classification_kind),
        fields: [
          { label: "ID", value: data.id },
          { label: "Code", value: data.code },
          { label: "Name", value: data.name },
          { label: "Classification", value: formatLabel(data.classification_kind) },
          { label: "Classification Notes", value: data.classification_notes },
          { label: "Classification Reviewed At", value: formatDate(data.classification_reviewed_at) },
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
        .select("*")
        .eq("id", id)
        .maybeSingle()) as {
        data: Tables<"organization_memberships"> | null;
        error: PostgrestError | null;
      };

      if (error) {
        throw new Error("Failed to load membership detail.", { cause: error });
      }

      if (!data) return null;

      return {
        title: formatShortId(data.id),
        description: "Organization-scoped access record.",
        badge: formatLabel(data.status),
        fields: [
          { label: "ID", value: data.id },
          { label: "Profile ID", value: data.profile_id },
          { label: "Organization ID", value: data.organization_id },
          { label: "Role", value: formatLabel(data.role) },
          { label: "Status", value: formatLabel(data.status) },
          { label: "Invited At", value: formatDate(data.invited_at) },
          { label: "Approved At", value: formatDate(data.approved_at) },
          { label: "Removed At", value: formatDate(data.removed_at) },
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
            {detail.description} This page is read-only. Mutations remain
            blocked until a separately reviewed workflow is approved.
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
    </main>
  );
}
