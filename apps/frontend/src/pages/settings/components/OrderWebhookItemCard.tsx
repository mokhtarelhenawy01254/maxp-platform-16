import React, { useState } from "react";
import {
  Play,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  RefreshCw,
  Clock,
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
    <div className="bg-card border border-border/70 rounded-xl p-4 sm:p-5 space-y-3.5 transition hover:border-primary/40">
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
              <h4 className="text-xs font-semibold text-foreground truncate">
                {wh.name || "Webhook Endpoint"}
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                {wh.events}
              </span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground break-all mt-0.5 select-all">
              {wh.url}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => onToggleActive(wh)}
            className={`text-[11px] px-2.5 py-1 rounded-md font-medium border transition ${
              wh.isActive
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-muted border-border text-muted-foreground"
            }`}
          >
            {wh.isActive ? "نشط" : "معطل"}
          </button>
          <button
            type="button"
            onClick={() => onTest(wh)}
            disabled={isTesting}
            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-medium bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 transition disabled:opacity-50"
            title="إرسال طلب تجريبي"
          >
            {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            <span>اختبار</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenLogs(wh)}
            className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-muted hover:bg-muted/80 border border-border text-foreground transition"
            title="عرض سجلات الإرسال"
          >
            السجلات
          </button>
          <button
            type="button"
            onClick={() => onEdit(wh)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
            title="تعديل"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(wh.id)}
            className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
            title="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Secret and Telemetry Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
        {/* Secret Display */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/70">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-muted-foreground text-[11px] shrink-0 font-medium">Secret:</span>
            <span className="font-mono text-[11px] text-foreground truncate select-all">
              {isVisible ? wh.secret : `${wh.secret.slice(0, 8)}••••••••••••${wh.secret.slice(-4)}`}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsVisible((p) => !p)}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
              title={isVisible ? "إخفاء" : "إظهار"}
            >
              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onCopySecret(wh.secret, wh.id)}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
              title="نسخ السيكريت"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/70 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px]">
              آخر إرسال:{" "}
              <span className="text-foreground font-medium">
                {wh.lastTriggeredAt
                  ? new Date(wh.lastTriggeredAt).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "لم يُرسل بعد"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {wh.lastStatusCode && (
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  wh.lastStatusCode >= 200 && wh.lastStatusCode < 300
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                HTTP {wh.lastStatusCode}
              </span>
            )}
            <span className="tabular-nums text-foreground font-semibold text-[11px]">
              {wh.successCount} نجاح / {wh.failureCount} فشل
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderWebhookItemCard;
