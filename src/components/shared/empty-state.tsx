import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      {icon ? (
        <div
          className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}
