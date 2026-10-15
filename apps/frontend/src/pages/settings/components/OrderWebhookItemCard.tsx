import React, { useState } from "react";
import {
  Play,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  RefreshCw,
  Clock,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { WebhookConfig } from "./OrderWebhookFormModal";

interface OrderWebhookItemCardProps {
  webhook: WebhookConfig;
  isTesting: boolean;
  onToggleActive: (wh: WebhookConfig) => void;
  onTest: (wh: WebhookConfig) => void;
  onOpenLogs: (wh: WebhookConfig) => void;
  onEdit: (wh: WebhookConfig) => void;
  onDelete: (id: string) => void;
  onCopySecret: (secret: string, id: string) => void;
  isCopied: boolean;
}

export const OrderWebhookItemCard: React.FC<OrderWebhookItemCardProps> = ({
  webhook: wh,
  isTesting,
  onToggleActive,
  onTest,
  onOpenLogs,
  onEdit,
  onDelete,
  onCopySecret,
  isCopied,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-3.5 transition-all hover:border-primary/40 shadow-xs font-sans">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              wh.isActive ? "bg-emerald-500 ring-4 ring-emerald-500/20" : "bg-muted-foreground/40"
            }`}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                {wh.name || "Webhook Endpoint"}
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60 shrink-0">
                {wh.events}
              </span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground break-all mt-0.5 select-all" dir="ltr">
              {wh.url}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => onToggleActive(wh)}
            className={`text-[11px] px-2.5 py-1 rounded-lg font-medium border transition ${
              wh.isActive
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {wh.isActive ? "نشط" : "معطل"}
          </button>
          <button
            type="button"
            onClick={() => onTest(wh)}
            disabled={isTesting}
            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 transition disabled:opacity-50"
            title="إرسال طلب تجريبي"
          >
            {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            <span>اختبار</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenLogs(wh)}
            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium bg-card hover:bg-muted/60 border border-border/70 text-foreground transition shadow-xs"
            title="عرض سجلات الإرسال"
          >
            <FileText className="w-3 h-3 text-muted-foreground" />
            <span>السجلات</span>
          </button>
          <button
            type="button"
            onClick={() => onEdit(wh)}
            className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground transition shadow-xs"
            title="تعديل"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(wh.id)}
            className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition shadow-xs"
            title="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Secret Key Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/20 border border-border/60 rounded-xl px-3 py-2 text-xs">
        <div className="flex items-center gap-2 font-mono text-[11px] min-w-0" dir="ltr">
          <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground font-sans">Secret:</span>
          <span className="text-foreground truncate select-all">
            {isVisible
              ? wh.secret
              : `${wh.secret.slice(0, 10)}${"•".repeat(Math.max(0, wh.secret.length - 14))}${wh.secret.slice(-4)}`}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition"
            title={isVisible ? "إخفاء" : "إظهار"}
          >
            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onCopySecret(wh.secret, wh.id)}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
            title="نسخ السيكريت"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{isCopied ? "تم النسخ" : "نسخ"}</span>
          </button>
        </div>
      </div>

      {/* Status & Telemetry Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="font-medium text-foreground">الحالة الأخيرة:</span>
            {wh.lastStatusCode ? (
              <span
                className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                  wh.lastStatusCode >= 200 && wh.lastStatusCode < 300
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                HTTP {wh.lastStatusCode}
              </span>
            ) : (
              <span className="text-muted-foreground">لم يُرسل بعد</span>
            )}
          </span>

          <span className="flex items-center gap-1 font-mono tabular-nums">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{wh.successCount}</span>{" "}
            ناجح / <span className="text-destructive font-semibold">{wh.failureCount}</span> فاشل
          </span>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground font-mono tabular-nums">
          <Clock className="w-3 h-3 text-muted-foreground/70" />
          <span>
            {wh.lastTriggeredAt
              ? `آخر إرسال: ${new Date(wh.lastTriggeredAt).toLocaleString("ar-EG")}`
              : "لم يُرسل أي طلب بعد"}
          </span>
        </div>
      </div>

      {wh.lastError && (
        <div className="p-2 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-[11px] font-mono break-all">
          {wh.lastError}
        </div>
      )}
    </div>
  );
};
