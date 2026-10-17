import React from "react";
import { ArrowRight, Bot, ExternalLink, Copy, Check } from "lucide-react";

export interface LogItem {
  id: string;
  changeType: string;
  createdAt: string;
  reason?: string | null;
  user?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  fromStatus?: {
    code?: string;
    name?: string;
    color?: string;
  } | null;
  toStatus?: {
    code?: string;
    name?: string;
    color?: string;
  } | null;
  order?: {
    orderNumber: string;
    isGuest?: boolean;
    customerName?: string | null;
    total?: number | string | null;
  } | null;
}

export const CHANGE_TYPE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  normal: {
    label: "تغيير حالة",
    badgeClass: "bg-muted text-muted-foreground border-border/70",
  },
  data_update: {
    label: "تعديل بيانات",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  bot_whatsapp: {
    label: "تأكيد واتساب",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  bulk_update: {
    label: "تحديث جماعي",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  override: {
    label: "تجاوز بصلاحية",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  approved: {
    label: "اعتماد رسمي",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  cancelled: {
    label: "إلغاء طلب",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  return: {
    label: "حركة مرتجع",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

interface ActivityLogTimelineViewProps {
  logs: LogItem[];
  copiedOrderId: string | null;
  onCopy: (text: string, id: string) => void;
  formatTimestamp: (ts: string) => { relative: string; timeStr: string; dateStr: string };
}

export const ActivityLogTimelineView: React.FC<ActivityLogTimelineViewProps> = ({
  logs,
  copiedOrderId,
  onCopy,
  formatTimestamp,
}) => {
  return (
    <div className="relative pr-4 sm:pr-6 space-y-3">
      {/* Continuous Vertical Rail */}
      <div className="absolute right-[7px] sm:right-[11px] top-3 bottom-3 w-px bg-border/60 pointer-events-none" />

      {logs.map((log) => {
        const { relative, timeStr, dateStr } = formatTimestamp(log.createdAt);
        const typeConfig = CHANGE_TYPE_CONFIG[log.changeType] || CHANGE_TYPE_CONFIG.normal;
        const isBot =
          log.user?.firstName?.includes("Bot") ||
          log.user?.id?.includes("WHATSAPP");

        return (
          <div key={log.id} className="relative group">
            {/* Timeline Node Bullet */}
            <div
              className="absolute -right-4 sm:-right-6 top-3.5 w-3.5 h-3.5 rounded-full border-2 border-background bg-card flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ borderColor: log.toStatus?.color || "#3B82F6" }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: log.toStatus?.color || "#3B82F6" }}
              />
            </div>

            {/* Entry Card (Single-Surface Hairline Box) */}
            <div className="bg-card hover:bg-card/90 border border-border/70 hover:border-border rounded-xl p-3.5 sm:p-4 transition-colors shadow-xs">
              {/* Row 1: Header (Actor + Time + Order Info) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/40">
                <div className="flex items-center gap-2">
                  {/* Actor Avatar */}
                  <div className="w-6 h-6 rounded-full bg-muted text-foreground flex items-center justify-center text-[10px] font-semibold tracking-tight border border-border/70 shrink-0">
                    {isBot ? (
                      <Bot className="w-3.5 h-3.5" />
                    ) : log.user?.firstName && log.user.firstName.trim().toLowerCase() !== "user" ? (
                      log.user.firstName.charAt(0)
                    ) : (
                      "ن"
                    )}
                  </div>

                  <span className="text-xs sm:text-sm font-semibold text-foreground">
                    {log.user?.firstName && log.user.firstName.trim().toLowerCase() !== "user"
                      ? log.user.firstName
                      : "النظام"}
                  </span>

                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeConfig.badgeClass}`}
                  >
                    {typeConfig.label}
                  </span>
                </div>

                {/* Timestamps */}
                <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-muted-foreground">
                  <span className="text-foreground/80 font-medium">{relative}</span>
                  <span className="text-border">|</span>
                  <span>{dateStr}</span>
                  <span>{timeStr}</span>
                </div>
              </div>

              {/* Row 2: Status Transition & Order Info */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2.5">
                {/* Transition Badge */}
                <div className="flex items-center gap-2 text-xs">
                  {log.changeType === "data_update" ||
                  (log.fromStatus?.name &&
                    log.toStatus?.name &&
                    log.fromStatus.name === log.toStatus.name) ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border"
                      style={{
                        borderColor: `${log.toStatus?.color || "#71717A"}50`,
                        backgroundColor: `${log.toStatus?.color || "#71717A"}20`,
                        color: log.toStatus?.color || "#71717A",
                      }}
                    >
                      <span>{log.toStatus?.name || "تعديل بيانات"}</span>
                      <span className="text-[10px] font-medium opacity-80">(تعديل بيانات)</span>
                    </span>
                  ) : (
                    <>
                      {log.fromStatus?.name && (
                        <>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
                            style={{
                              borderColor: `${log.fromStatus.color || "#71717A"}40`,
                              backgroundColor: `${log.fromStatus.color || "#71717A"}15`,
                              color: log.fromStatus.color || "#71717A",
                            }}
                          >
                            {log.fromStatus.name}
                          </span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground rotate-180" />
                        </>
                      )}
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border"
                        style={{
                          borderColor: `${log.toStatus?.color || "#71717A"}50`,
                          backgroundColor: `${log.toStatus?.color || "#71717A"}20`,
                          color: log.toStatus?.color || "#71717A",
                        }}
                      >
                        {log.toStatus?.name || log.toStatus?.code}
                      </span>
                    </>
                  )}
                </div>

                {/* Order Badge & Customer */}
                {log.order && (
                  <div className="flex items-center gap-2">
                    {log.order.isGuest && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        طلب زائر
                      </span>
                    )}
                    <a
                      href={`/orders?search=${encodeURIComponent(log.order.orderNumber)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-xs font-mono tabular-nums font-medium text-foreground border border-border/70 transition-colors"
                    >
                      <span>{log.order.orderNumber}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>

                    <button
                      type="button"
                      onClick={() => onCopy(log.order!.orderNumber, log.id)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                      title="نسخ رقم الطلب"
                    >
                      {copiedOrderId === log.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    {log.order.customerName && (
                      <span className="hidden sm:inline text-xs text-muted-foreground font-medium">
                        {log.order.customerName}
                      </span>
                    )}

                    {log.order.total && (
                      <span className="text-xs font-mono tabular-nums font-bold text-foreground">
                        {Number(log.order.total).toLocaleString("ar-EG")} ج.م
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Row 3: Notes / Reason */}
              {log.reason && (
                <div className="mt-2.5 pt-2 border-t border-border/30">
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs font-mono text-foreground/90 whitespace-pre-line leading-relaxed">
                    {log.reason}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
