"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-start gap-3 rounded-lg border bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Admin page error</h2>
        <p className="text-sm text-muted-foreground">
          The admin workspace could not finish loading this view.
        </p>
        <Button onClick={reset} type="button">
          Try again
        </Button>
      </div>
    </div>
  );
}
