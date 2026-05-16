"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
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
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Something went wrong
        </h2>

        <p className="mb-6 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again or return to the home
          page.
        </p>

        {process.env.NODE_ENV === "development" && error.message && (
          <pre className="mb-6 max-h-32 overflow-auto rounded-lg border border-border bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try Again
          </button>

          <Link
            href="/"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
