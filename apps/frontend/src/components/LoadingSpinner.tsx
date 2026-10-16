import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "white" | "gray";
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "primary",
  className = "",
}) => {
  const sizeClasses = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
    xl: "size-10",
  };

  const colorClasses = {
    primary: "text-primary",
    white: "text-white",
    gray: "text-muted-foreground/80",
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <Loader2
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        aria-hidden="true"
      />
    </div>
  );
};

export default LoadingSpinner;
