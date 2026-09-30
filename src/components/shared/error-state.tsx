"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "Try again. If the problem continues, contact support.",
  onRetry,
}: ErrorStateProps) {
  return (
    <section
      className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center"
      role="alert"
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle aria-hidden="true" className="size-6" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {onRetry ? (
        <Button className="mt-6" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </section>
  );
}
