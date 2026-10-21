import React from "react";
import type { StudioDeviceMode } from "../StudioTypes";

export interface ResponsiveFieldBadgeProps {
  deviceMode?: StudioDeviceMode;
  isCustomized?: boolean;
  onReset?: () => void;
  className?: string;
  propName?: string;
}

/**
 * Micro-badge indicating per-breakpoint customization (Ticket 5R).
 * When active on mobile/tablet:
 * - Shows badge: «مُخصص للجوال» / «مُخصص للتابلت»
 * - Shows button: «إرجاع للأساسي» (clears the override key)
 */
export const ResponsiveFieldBadge: React.FC<ResponsiveFieldBadgeProps> = ({
  deviceMode = "desktop",
  isCustomized = true,
  onReset,
  className = "",
  propName,
}) => {
  if (deviceMode === "desktop" || !isCustomized) return null;

  return (
    <div
      data-responsive-badge-container={propName || "true"}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <span
        data-testid={propName ? `badge-customized-${propName}` : "responsive-customized-badge"}
        data-responsive-badge="true"
        className="inline-flex items-center gap-0.5 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700"
      >
        {deviceMode === "mobile" ? "مُخصص للجوال" : "مُخصص للتابلت"}
      </span>
      {onReset && (
        <button
          type="button"
          data-action={propName ? `reset-${propName}` : "reset-to-base"}
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          title="إرجاع للأساسي"
          className="text-[9px] font-medium text-red-600 hover:text-red-700 hover:underline cursor-pointer"
        >
          إرجاع للأساسي
        </button>
      )}
    </div>
  );
};

export interface ResponsivePropertyHeaderProps {
  label: string;
  propName?: string;
  deviceMode?: StudioDeviceMode;
  isCustomized?: boolean;
  onReset?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const ResponsivePropertyHeader: React.FC<ResponsivePropertyHeaderProps> = ({
  label,
  propName,
  deviceMode = "desktop",
  isCustomized = false,
  onReset,
  className = "",
  children,
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-[#3f434a]">{label}</span>
        {isCustomized && (
          <ResponsiveFieldBadge
            deviceMode={deviceMode}
            isCustomized={isCustomized}
            propName={propName}
            onReset={onReset}
          />
        )}
      </div>
      {children}
    </div>
  );
};
