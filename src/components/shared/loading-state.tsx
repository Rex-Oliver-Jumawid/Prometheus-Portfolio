interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="h-8 w-2/5 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      </div>
    </div>
  );
}
