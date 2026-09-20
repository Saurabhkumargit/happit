import { type ReactNode } from "react";

import { cn } from "./tiltCardConstants";

import "./TiltCard.css";

export interface TiltCardProps {
  children: ReactNode;
  glare?: boolean;
  className?: string;
}

export function TiltCard({
  children,
  glare = true,
  className,
}: TiltCardProps) {
  return (
    <div
      className={cn(
        "tilt-card",
        glare ? "tilt-card-hover" : "",
        className,
      )}
    >
      {children}

      {glare && (
        <div
          aria-hidden="true"
          className="tilt-card-glare"
        />
      )}
    </div>
  );
}

export default TiltCard;