import React from "react";
import { ArrowRight } from "lucide-react";
import { LogItem, CHANGE_TYPE_CONFIG } from "./ActivityLogTimelineView";

interface ActivityLogTableViewProps {
  logs: LogItem[];
  formatTimestamp: (ts: string) => { relative: string; timeStr: string; dateStr: string };
}

export const ActivityLogTableView: React.FC<ActivityLogTableViewProps> = ({
  logs,
  formatTimestamp,
}) => {
  return (
    <div className="border border-border/70 rounded-xl overflow-hidden bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-muted/60 border-b border-border/70 text-muted-foreground font-semibold">
            <tr>
              <th className="py-2.5 px-3.5">الوقت</th>
              <th className="py-2.5 px-3.5">رقم الطلب</th>
              <th className="py-2.5 px-3.5">العميل</th>
              <th className="py-2.5 px-3.5">الموظف / النظام</th>
              <th className="py-2.5 px-3.5">الانتقال</th>
              <th className="py-2.5 px-3.5">نوع الحركة</th>
              <th className="py-2.5 px-3.5">الملاحظات والتفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {logs.map((log) => {
              const { relative, timeStr } = formatTimestamp(log.createdAt);
              const typeConfig = CHANGE_TYPE_CONFIG[log.changeType] || CHANGE_TYPE_CONFIG.normal;

              return (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3.5 font-mono tabular-nums whitespace-nowrap">
                    <span className="font-semibold text-foreground">{relative}</span>
                    <span className="block text-[10px] text-muted-foreground">{timeStr}</span>
                  </td>

                  <td className="py-2.5 px-3.5 whitespace-nowrap font-mono tabular-nums font-semibold">
                    {log.order ? (
                      <div className="flex items-center gap-1.5">
                        {log.order.isGuest && (
                          <span className="px-1 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            زائر
                          </span>
                        )}
                        <a
                          href={`/orders?search=${encodeURIComponent(log.order.orderNumber)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-primary"
                        >
                          {log.order.orderNumber}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3.5 whitespace-nowrap text-foreground font-medium">
                    {log.order?.customerName || "—"}
                  </td>

                  <td className="py-2.5 px-3.5 whitespace-nowrap font-medium text-foreground">
                    {log.user?.firstName && log.user.firstName.trim().toLowerCase() !== "user"
                      ? log.user.firstName
                      : "النظام"}
                  </td>

                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    {log.changeType === "data_update" ||
                    (log.fromStatus?.name &&
                      log.toStatus?.name &&
                      log.fromStatus.name === log.toStatus.name) ? (
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-semibold border inline-flex items-center gap-1"
                        style={{
                          borderColor: `${log.toStatus?.color || "#71717A"}50`,
                          backgroundColor: `${log.toStatus?.color || "#71717A"}20`,
                          color: log.toStatus?.color || "#71717A",
                        }}
                      >
                        <span>{log.toStatus?.name || "تعديل بيانات"}</span>
                        <span className="text-[9px] font-medium opacity-80">(تعديل بيانات)</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {log.fromStatus?.name && (
                          <>
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium border"
                              style={{
                                borderColor: `${log.fromStatus.color || "#71717A"}40`,
                                backgroundColor: `${log.fromStatus.color || "#71717A"}15`,
                                color: log.fromStatus.color || "#71717A",
                              }}
                            >
                              {log.fromStatus.name}
                            </span>
                            <ArrowRight className="w-2.5 h-2.5 text-muted-foreground rotate-180" />
                          </>
                        )}
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold border"
                          style={{
                            borderColor: `${log.toStatus?.color || "#71717A"}50`,
                            backgroundColor: `${log.toStatus?.color || "#71717A"}20`,
                            color: log.toStatus?.color || "#71717A",
                          }}
                        >
                          {log.toStatus?.name || log.toStatus?.code}
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeConfig.badgeClass}`}
                    >
                      {typeConfig.label}
                    </span>
                  </td>

                  <td className="py-2.5 px-3.5 max-w-xs truncate font-mono text-[11px] text-muted-foreground">
                    {log.reason || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
