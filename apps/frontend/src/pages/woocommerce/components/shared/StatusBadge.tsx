import React from "react";
import { getStatusDisplay } from "../../../../utils/statusRegistry";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const info = getStatusDisplay(status);
  return (
    <span className={`px-2 py-1 text-xs rounded-full border ${info.colorClass}`}>
      {info.label}
    </span>
  );
};
