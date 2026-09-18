import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>

        <section className="space-y-3" aria-label="Loading account summary">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="h-10 w-44" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-24" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

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
                  <Skeleton key={index} className="h-44 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
