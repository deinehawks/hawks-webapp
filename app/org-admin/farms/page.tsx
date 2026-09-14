import Link from "next/link";

import {
  EmptyState,
  OrgAdminPage,
  OrgAdminSection,
  StatusBadge,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/org-admin/org-admin-ui";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createOrgAdminFarm } from "@/lib/actions/org-admin";
import type { Tables } from "@/lib/database.types";
import { getOrgAdminContext } from "@/lib/org-admin/context";
import { createClient } from "@/utils/supabase/server";

type FarmListRow = Pick<
  Tables<"farms">,
  | "id"
  | "name"
  | "code"
  | "crop"
  | "location_name"
  | "area_hectares"
  | "status"
>;

function displayValue(value: string | null) {
  return value || "Not set";
}

function formatArea(value: number | null) {
  return value === null ? "Not set" : `${value} ha`;
}

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
    ? await supabase
        .from("farms")
        .select("id, name, code, crop, location_name, area_hectares, status")
        .in("id", farmIds)
        .order("name")
    : { data: [], error: null };
  if (farmsResult.error) {
    throw new Error("Failed to load farm records.", { cause: farmsResult.error });
  }

  const farms = (farmsResult.data ?? []) as FarmListRow[];

  return (
    <OrgAdminPage
      title="Farms"
      description="Create farms for your organization and manage confirmed linked farms."
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

      <OrgAdminSection
        title="Confirmed farms"
        description="Open a farm to edit its metadata and status."
      >
        {farms.length === 0 ? (
          <EmptyState>No confirmed organization farms are available.</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farm</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Crop</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farms.map((farm) => (
                  <TableRow key={farm.id}>
                    <TableCell className="min-w-48 font-medium whitespace-normal">
                      {farm.name}
                    </TableCell>
                    <TableCell>{displayValue(farm.code)}</TableCell>
                    <TableCell>{displayValue(farm.crop)}</TableCell>
                    <TableCell className="min-w-48 whitespace-normal">
                      {displayValue(farm.location_name)}
                    </TableCell>
                    <TableCell>{formatArea(farm.area_hectares)}</TableCell>
                    <TableCell>
                      <StatusBadge value={farm.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/org-admin/farms/${farm.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </OrgAdminSection>
    </OrgAdminPage>
  );
}
