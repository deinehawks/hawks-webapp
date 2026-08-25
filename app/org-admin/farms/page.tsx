import {
  EmptyState,
  OrgAdminPage,
  OrgAdminSection,
  SelectField,
  StatusBadge,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/org-admin/org-admin-ui";
import { createOrgAdminFarm, updateOrgAdminFarm } from "@/lib/actions/org-admin";
import { getOrgAdminContext } from "@/lib/org-admin/context";
import { createClient } from "@/utils/supabase/server";

const farmStatuses = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export default async function OrgAdminFarmsPage() {
  const { organization } = await getOrgAdminContext();
  const supabase = await createClient();
  const { data: links, error: linkError } = await supabase
    .from("farm_organizations")
    .select("farm_id")
    .eq("organization_id", organization.id)
    .eq("review_status", "confirmed");
  if (linkError) throw new Error("Failed to load confirmed farms.", { cause: linkError });

  const farmIds = (links ?? []).map((link) => link.farm_id);
  const farmsResult = farmIds.length
    ? await supabase.from("farms").select("*").in("id", farmIds).order("name")
    : { data: [], error: null };
  if (farmsResult.error) {
    throw new Error("Failed to load farm records.", { cause: farmsResult.error });
  }

  return (
    <OrgAdminPage
      title="Farms"
      description="Create farms for your organization and edit metadata for confirmed linked farms."
    >
      <OrgAdminSection
        title="Create farm"
        description="Creation automatically records a confirmed owner relationship to your organization."
      >
        <form action={createOrgAdminFarm} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TextField name="name" label="Farm name" required />
            <TextField name="code" label="Farm code" />
            <TextField name="crop" label="Crop" defaultValue="banana" />
            <TextField name="location" label="Location" />
            <TextField name="areaHectares" label="Area (hectares)" type="number" min={0} step="any" />
          </div>
          <TextAreaField name="notes" label="Notes" />
          <SubmitButton>Create farm</SubmitButton>
        </form>
      </OrgAdminSection>
      <div className="space-y-4">
        {!farmsResult.data?.length ? (
          <EmptyState>No confirmed organization farms are available.</EmptyState>
        ) : (
          farmsResult.data.map((farm) => (
            <OrgAdminSection
              key={farm.id}
              title={farm.name}
              description={farm.code ? `Farm code: ${farm.code}` : "No farm code"}
            >
              <form action={updateOrgAdminFarm} className="space-y-4">
                <input type="hidden" name="farmId" value={farm.id} />
                <div className="flex items-center gap-2">
                  <StatusBadge value={farm.status} />
                </div>
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
                  <SelectField name="status" label="Status" defaultValue={farm.status} options={farmStatuses} />
                </div>
                <TextAreaField name="notes" label="Notes" defaultValue={farm.notes} />
                <SubmitButton>Save farm</SubmitButton>
              </form>
            </OrgAdminSection>
          ))
        )}
      </div>
    </OrgAdminPage>
  );
}

