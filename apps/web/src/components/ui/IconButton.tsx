import { type ButtonHTMLAttributes, type ReactNode } from "react";
import "./IconButton.css";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  label: string;
}

function IconButton({ children, label, className = "", ...props }: IconButtonProps) {
  const classes = ["icon-btn", className].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

export default IconButton;
