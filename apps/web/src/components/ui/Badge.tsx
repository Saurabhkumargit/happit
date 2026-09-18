import { type ReactNode } from "react";
import "./Badge.css";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  const classes = ["badge", `badge-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}

export default Badge;
