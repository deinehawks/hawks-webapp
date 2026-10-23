import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">We couldn’t load this page.</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Return to your dashboard and try opening it again.</p>
      <Button asChild className="mt-2 h-11 sm:h-9">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
