import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

import styles from "./liquid-glass-card.module.css";

type LiquidGlassCardProps = ComponentPropsWithoutRef<"div"> & {
  contentClassName?: string;
};

export function LiquidGlassCard({
  children,
  className,
  contentClassName,
  ...props
}: LiquidGlassCardProps) {
  return (
    <div className={cn(styles.card, className)} {...props}>
      <div className={styles.fill} aria-hidden="true" />
      <div className={styles.glass} aria-hidden="true" />
      <div className={cn(styles.content, contentClassName)}>{children}</div>
    </div>
  );
}
