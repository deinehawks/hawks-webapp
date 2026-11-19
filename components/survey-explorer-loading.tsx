import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SurveyExplorerLoading() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <Card>
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_11rem_auto]">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
              <Skeleton className="h-[30rem] w-full lg:h-[38rem]" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
