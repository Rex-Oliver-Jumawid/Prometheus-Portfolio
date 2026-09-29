"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-7xl p-6 lg:p-10">
      <ErrorState onRetry={reset} />
    </div>
  );
}
