import { CircleCheck, CircleX } from "lucide-react";

import { cn } from "@/lib/utils";

interface FormMessageProps {
  status: "success" | "error";
  children: string;
  className?: string;
}

export function FormMessage({ status, children, className }: FormMessageProps) {
  const Icon = status === "success" ? CircleCheck : CircleX;

  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-2 rounded-lg px-3 py-2.5 text-sm",
        status === "success"
          ? "bg-muted text-foreground"
          : "bg-destructive/10 text-destructive",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
