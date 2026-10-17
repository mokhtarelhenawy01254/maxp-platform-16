import React from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, CheckCircle2 } from "lucide-react";

export interface ChangeLogEntry {
  id: string;
  orderNumber: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
}

interface QuickStatusChangeLogProps {
  changeLog: ChangeLogEntry[];
  getStatusDisplayName: (statusValue: string) => string;
  onClearLog: () => void;
  renderStatusBadge: (status: string, label?: string) => React.ReactNode;
}

export const QuickStatusChangeLog: React.FC<QuickStatusChangeLogProps> = ({
  changeLog,
  getStatusDisplayName,
  onClearLog,
  renderStatusBadge,
}) => {
  const { t } = useTranslation();

  if (changeLog.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/70 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-3.5 bg-muted/30 border-b border-border/60">
        <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <RotateCcw className="text-primary" size={18} />
          {t("quickStatus.changeLog")} ({changeLog.length})
        </h2>
        <button
          onClick={onClearLog}
          className="text-xs px-2.5 py-1 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors font-medium"
        >
          مسح السجل
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border/60 text-right" dir="rtl">
          <thead className="bg-muted/20 text-[11px] font-semibold text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2.5 text-right">{t("quickStatus.orderCode")}</th>
              <th className="px-4 py-2.5 text-right">{t("quickStatus.oldStatus")}</th>
              <th className="px-4 py-2.5 text-right">{t("quickStatus.newStatus")}</th>
              <th className="px-4 py-2.5 text-right">{t("quickStatus.changedAt")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs">
            {changeLog.map((entry) => (
              <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono text-xs font-bold text-primary tabular-nums">
                    {entry.orderNumber}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {renderStatusBadge(entry.oldStatus, getStatusDisplayName(entry.oldStatus))}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {entry.newStatus ? (
                    <div className="flex items-center gap-1.5">
                      {renderStatusBadge(entry.newStatus, getStatusDisplayName(entry.newStatus))}
                      <CheckCircle2 className="text-emerald-500 shrink-0" size={14} />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono tabular-nums text-[11px]">
                  {entry.changedAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
