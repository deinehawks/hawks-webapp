import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFarm } from "@/lib/actions/admin-farms";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";

export default async function AdminFarmNewPage() {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin") redirect("/dashboard");

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <Button asChild className="w-fit" size="sm" variant="outline"><Link href="/admin/farms"><ArrowLeft />Farms</Link></Button>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2"><ClipboardList className="size-5 text-muted-foreground" /><h1 className="text-2xl font-semibold tracking-normal">New farm</h1><Badge variant="secondary">Farm Operations</Badge></div>
          <p className="max-w-3xl text-sm text-muted-foreground">Create a canonical farm or plantation-area record. Organization and survey relationships are managed after the farm exists.</p>
        </div>
      </div>

      <Card className="rounded-lg"><CardHeader><CardTitle className="text-base">Farm details</CardTitle></CardHeader><CardContent><form action={createFarm} className="grid gap-4 lg:grid-cols-2">
        <FarmFields />
        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">New farms start active. Status can be changed from the farm detail page.</p><Button type="submit">Create farm</Button></div>
      </form></CardContent></Card>
    </main>
  );
}

function FarmFields() {
  return <>
    <label className="grid gap-2 text-sm font-medium">Name<input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={200} name="name" required /></label>
    <label className="grid gap-2 text-sm font-medium">Code<input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={80} name="code" /></label>
    <label className="grid gap-2 text-sm font-medium">Crop<input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="banana" maxLength={80} name="crop" /></label>
    <label className="grid gap-2 text-sm font-medium">Area hectares<input className="h-9 rounded-md border bg-background px-3 text-sm" min="0" name="areaHectares" step="0.0001" type="number" /></label>
    <label className="grid gap-2 text-sm font-medium lg:col-span-2">Location<input className="h-9 rounded-md border bg-background px-3 text-sm" maxLength={200} name="locationName" /></label>
    <label className="grid gap-2 text-sm font-medium lg:col-span-2">Notes<textarea className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm" maxLength={2000} name="notes" rows={4} /></label>
  </>;
}