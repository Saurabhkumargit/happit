import { type ReactNode } from "react";
import "./ErrorState.css";

export interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
}

function ErrorState({
  title = "Something went wrong",
  message,
  action,
}: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <p className="error-state-title">{title}</p>
      <p className="error-state-message">{message}</p>
      {action && <div className="error-state-action">{action}</div>}
    </div>
  );
}

export default ErrorState;
