import Link from "next/link";
import { notFound } from "next/navigation";

import {
  OrgAdminPage,
  OrgAdminSection,
  SelectField,
  StatusBadge,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/org-admin/org-admin-ui";
import { Button } from "@/components/ui/button";
import { updateOrgAdminFarm } from "@/lib/actions/org-admin";
import type { Tables } from "@/lib/database.types";
import { getOrgAdminContext } from "@/lib/org-admin/context";
import { createClient } from "@/utils/supabase/server";

const farmStatuses = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

type FarmRow = Tables<"farms">;

export default async function OrgAdminFarmDetailPage({
  params,
}: {
  params: Promise<{ farmId: string }>;
}) {
  const { farmId } = await params;
  const { organization } = await getOrgAdminContext();
  const supabase = await createClient();

  const { data: confirmedLink, error: linkError } = await supabase
    .from("farm_organizations")
    .select("farm_id")
    .eq("farm_id", farmId)
    .eq("organization_id", organization.id)
    .eq("review_status", "confirmed")
    .limit(1)
    .maybeSingle();
  if (linkError) {
    throw new Error("Failed to verify the farm relationship.", { cause: linkError });
  }
  if (!confirmedLink) notFound();

  const { data, error } = await supabase
    .from("farms")
    .select("*")
    .eq("id", farmId)
    .maybeSingle();
  if (error) throw new Error("Failed to load the farm.", { cause: error });
  if (!data) notFound();

  const farm = data as FarmRow;

  return (
    <OrgAdminPage
      title={farm.name}
      description="Edit metadata for this confirmed organization farm."
    >
      <Button asChild className="w-fit" size="sm" variant="outline">
        <Link href="/org-admin/farms">Back to farms</Link>
      </Button>

      <OrgAdminSection
        title="Farm details"
        description={farm.code ? `Farm code: ${farm.code}` : "No farm code"}
      >
        <form action={updateOrgAdminFarm} className="space-y-4">
          <input type="hidden" name="farmId" value={farm.id} />
          <StatusBadge value={farm.status} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TextField name="name" label="Farm name" defaultValue={farm.name} required />
            <TextField name="code" label="Farm code" defaultValue={farm.code} />
            <TextField name="crop" label="Crop" defaultValue={farm.crop} />
            <TextField name="location" label="Location" defaultValue={farm.location_name} />
            <TextField
              name="areaHectares"
              label="Area (hectares)"
              type="number"
              min={0}
              step="any"
              defaultValue={farm.area_hectares}
            />
            <SelectField
              name="status"
              label="Status"
              defaultValue={farm.status}
              options={farmStatuses}
            />
          </div>
          <TextAreaField name="notes" label="Notes" defaultValue={farm.notes} />
          <SubmitButton>Save farm</SubmitButton>
        </form>
      </OrgAdminSection>
    </OrgAdminPage>
  );
}
