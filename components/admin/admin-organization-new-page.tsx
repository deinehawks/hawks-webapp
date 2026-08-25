import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createOrganization } from "@/lib/actions/admin-organizations";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

type OrganizationTypeOption = Pick<Tables<"organization_types">, "code" | "label">;

export default async function AdminOrganizationNewPage() {
  const { profile } = await getAuthenticatedUserContext();

  if (profile.role !== "platform_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_types")
    .select("code, label")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Failed to load organization types.", { cause: error });
  }

  const types = (data ?? []) as OrganizationTypeOption[];

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <Button asChild className="w-fit" size="sm" variant="outline">
          <Link href="/admin/organizations"><ArrowLeft />Organizations</Link>
        </Button>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-normal">New organization</h1>
            <Badge variant="secondary">Organization Operations</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Create a canonical organization for membership access and domain relationships. This does not create users, promote organization admins, or map legacy clients automatically.
          </p>
        </div>
      </div>

      <Card className="rounded-lg">
        <CardHeader><CardTitle className="text-base">Organization details</CardTitle></CardHeader>
        <CardContent>
          <form action={createOrganization} className="grid gap-4 lg:grid-cols-2">
            <OrganizationFields types={types} />
            <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">New organizations start active. Status can be changed from the organization detail page.</p>
              <Button disabled={types.length === 0} type="submit">Create organization</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function OrganizationFields({ types }: { types: OrganizationTypeOption[] }) {
  return (
    <>
      <label className="grid gap-2 text-sm font-medium">
        Name
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={200} name="name" required />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Type
        <select className="h-9 rounded-md border bg-background px-3 text-sm" disabled={types.length === 0} name="typeCode" required>
          <option value="">{types.length === 0 ? "No active types" : "Select type"}</option>
          {types.map((type) => <option key={type.code} value={type.code}>{type.label}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Code
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={80} name="code" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Email
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={320} name="email" type="email" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Mobile
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={80} name="mobile" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Telephone
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={80} name="telephone" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Street
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={200} name="street" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Village
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={120} name="village" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Barangay
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={120} name="barangay" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        City
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={120} name="city" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Province
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={120} name="province" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Region
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={120} name="region" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Country
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={120} name="country" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        ZIP code
        <input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={40} name="zipCode" />
      </label>
      <label className="grid gap-2 text-sm font-medium lg:col-span-2">
        Notes
        <textarea className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm" maxLength={2000} name="notes" rows={4} />
      </label>
    </>
  );
}