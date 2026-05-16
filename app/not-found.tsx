import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 text-5xl font-bold text-muted-foreground/40">
          404
        </div>

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Page Not Found
        </h2>

        <p className="mb-6 text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>

        <Link
          href="/"
          className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
