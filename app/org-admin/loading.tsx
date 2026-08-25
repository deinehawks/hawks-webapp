import { Skeleton } from "@/components/ui/skeleton";

export default function OrgAdminLoading() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

