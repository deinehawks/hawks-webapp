import { redirect } from "next/navigation";

export default async function LegacyAdminDetailPage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  const { resource, id } = await params;

  redirect(`/admin/${resource}/${id}`);
}
