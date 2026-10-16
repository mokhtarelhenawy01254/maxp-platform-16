import React from "react";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "white" | "gray";
  className?: string;
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "primary",
  className,
  label = "Loading...",
}) => {
  const sizeClasses = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
    xl: "size-10",
  };

  const colorClasses = {
    primary: "text-primary",
    secondary: "text-muted-foreground",
    white: "text-white",
    gray: "text-muted-foreground/80",
  };

  return (
    <div className={clsx("flex items-center justify-center", className)}>
      <div className="flex flex-col items-center gap-2">
        <Loader2
          className={clsx(
            "animate-spin transition-colors",
            sizeClasses[size],
            colorClasses[color]
          )}
          aria-hidden="true"
        />

        {label && (
          <span
            className={clsx(
              "text-xs font-medium",
              color === "white" ? "text-white" : "text-muted-foreground"
            )}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
