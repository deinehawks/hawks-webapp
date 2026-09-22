import {
  OrgAdminPage,
  OrgAdminSection,
  SelectField,
  StatusBadge,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/org-admin/org-admin-ui";
import { updateOrgAdminOrganization } from "@/lib/actions/org-admin";
import { getOrgAdminContext } from "@/lib/org-admin/context";
import { createClient } from "@/utils/supabase/server";

export default async function OrgAdminOrganizationPage() {
  const { organization } = await getOrgAdminContext();
  const supabase = await createClient();
  const { data: types, error } = await supabase
    .from("organization_types")
    .select("code, label")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    throw new Error("Failed to load organization types.", { cause: error });
  }

  return (
    <OrgAdminPage
      title="Organization profile"
      description="Edit descriptive and contact information. Lifecycle status remains platform-managed."
    >
      <OrgAdminSection title="Profile">
        <form action={updateOrgAdminOrganization} className="space-y-6">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Platform status</span>
            <StatusBadge value={organization.status} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TextField name="name" label="Name" defaultValue={organization.name} required />
            <TextField name="code" label="Unique code" defaultValue={organization.code} required />
            <SelectField
              name="typeCode"
              label="Organization type"
              defaultValue={organization.type_code}
              options={(types ?? []).map((type) => ({ value: type.code, label: type.label }))}
            />
            <TextField name="email" label="Email" type="email" defaultValue={organization.email} />
            <TextField name="mobile" label="Mobile" defaultValue={organization.mobile} />
            <TextField name="telephone" label="Telephone" defaultValue={organization.telephone} />
            <TextField name="street" label="Street" defaultValue={organization.street} />
            <TextField name="village" label="Village" defaultValue={organization.village} />
            <TextField name="barangay" label="Barangay" defaultValue={organization.barangay} />
            <TextField name="city" label="City" defaultValue={organization.city} />
            <TextField name="province" label="Province" defaultValue={organization.province} />
            <TextField name="region" label="Region" defaultValue={organization.region} />
            <TextField name="country" label="Country" defaultValue={organization.country} />
            <TextField name="zipCode" label="ZIP code" defaultValue={organization.zip_code} />
          </div>
          <TextAreaField name="notes" label="Notes" defaultValue={organization.notes} />
          <SubmitButton>Save organization</SubmitButton>
        </form>
      </OrgAdminSection>
    </OrgAdminPage>
  );
}

