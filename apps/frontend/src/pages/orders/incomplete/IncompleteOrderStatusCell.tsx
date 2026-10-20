import React from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { getStatusLabel } from "../incompleteUtils";

export interface IncompleteOrderStatusCellProps {
  status: string;
  expiry: { label: string; urgent?: boolean } | null;
}

export const IncompleteOrderStatusCell: React.FC<IncompleteOrderStatusCellProps> = ({
  status,
  expiry,
}) => {
  const { t } = useTranslation();

  return (
    <td className="px-3 py-2.5">
      <div className="flex flex-col gap-1">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border w-fit ${
            status === "lost"
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "lost" ? "bg-rose-500" : "bg-amber-500"
            }`}
          />
          <span>{getStatusLabel(status, t)}</span>
        </span>
        {expiry && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
              expiry.urgent ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>{expiry.label}</span>
          </span>
        )}
      </div>
    </td>
  );
};
