import { type ReactNode } from "react";
import "./Card.css";

export interface CardProps {
  children: ReactNode;
  className?: string;
}

function Card({ children, className = "" }: CardProps) {
  const classes = ["card", className].filter(Boolean).join(" ");

  return <div className={classes}>{children}</div>;
}

export default Card;
