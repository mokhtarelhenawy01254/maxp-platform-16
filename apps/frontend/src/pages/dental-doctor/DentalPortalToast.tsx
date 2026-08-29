import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

interface DentalPortalToastProps {
  message: string;
  to?: string;
  actionLabel?: string;
  tone?: "success" | "error";
  onDismiss: () => void;
  autoHideMs?: number;
}

const DentalPortalToast: React.FC<DentalPortalToastProps> = ({
  message,
  to,
  actionLabel,
  tone = "success",
  onDismiss,
  autoHideMs = 3000,
}) => {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const timer = window.setTimeout(() => onDismissRef.current(), autoHideMs);
    return () => window.clearTimeout(timer);
  }, [autoHideMs]);

  const boxClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-green-200 bg-green-50 text-green-800";
  const linkClass =
    tone === "error"
      ? "text-red-900 underline-offset-2 hover:underline"
      : "text-green-900 underline-offset-2 hover:underline";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm ${boxClass}`}
    >
      <span>{message}</span>
      {to && actionLabel ? (
        <Link to={to} className={`font-semibold ${linkClass}`}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
};

export default DentalPortalToast;