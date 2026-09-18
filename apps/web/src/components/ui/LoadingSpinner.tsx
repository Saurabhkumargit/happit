import "./LoadingSpinner.css";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

function LoadingSpinner({ size = "md", label = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className={`loading-spinner loading-spinner-${size}`} role="status">
      <div className="loading-spinner-circle" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default LoadingSpinner;
