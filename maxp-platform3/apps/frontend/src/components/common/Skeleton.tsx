import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "text",
  width,
  height,
}) => {
  const baseClass = "animate-pulse bg-gray-200 rounded";
  const variantClass = variant === "circular" ? "rounded-full" : variant === "rectangular" ? "rounded-lg" : "rounded";

  return (
    <div
      className={`${baseClass} ${variantClass} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
};
