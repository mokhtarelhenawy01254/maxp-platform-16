import React, { useState, useEffect } from "react";
import {
  Smartphone,
  RotateCw,
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Wifi,
} from "lucide-react";
import { telephonyClientService } from "../../services/telephonyService";
import { useDevicePresence, refreshDevicePresence } from "../../hooks/useDevicePresence";

interface TelephonyDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelephonyDiagnosticsModal: React.FC<TelephonyDiagnosticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { presence } = useDevicePresence();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const serverLogs = await telephonyClientService.getDiagnosticLogs();
      const localLogs =
        typeof window !== "undefined" && (window as any).__MAXP_TELEPHONY_LOGS__
          ? [...(window as any).__MAXP_TELEPHONY_LOGS__].reverse()
          : [];

      // دمج السجلات مع الأولوية للمحلي ثم الخادم مع منع التكرار
      const combined = [...localLogs];
      serverLogs.forEach((sLog: any) => {
        const isDuplicate = combined.some((l) => {
          if (l.timestamp === sLog.timestamp && l.event === sLog.event) return true;
          // نافذة زمنية 2 ثانية في حال كان الفارق طفيفاً بين وقت الإرسال والاستلام
          if (
            l.event === sLog.event &&
            Math.abs(new Date(l.timestamp).getTime() - new Date(sLog.timestamp).getTime()) < 2000
          ) {
            return true;
          }
          return false;
        });

        if (!isDuplicate) {
          combined.push(sLog);
        }
      });

      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(combined);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchLogs();
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getEventBadge = (event: string) => {
    if (event.includes("SUCCESS") || event.includes("READY")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <CheckCircle2 className="size-3" />
          {event}
        </span>
      );
    }
    if (event.includes("FAILED") || event.includes("ERROR")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
          <XCircle className="size-3" />
          {event}
        </span>
      );
    }
    if (event.includes("DIAL") || event.includes("TRIGGER")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
          <Activity className="size-3" />
          {event}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
        <Clock className="size-3" />
        {event}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-right font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors"
          >
            <X className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">سجل تشخيص الاتصال الهاتفي والموبايل</h3>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Smartphone className="size-5" />
            </div>
          </div>
        </div>

        {/* Device Status Bar */}
        <div className="p-4 bg-muted/10 border-b border-border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-xl border border-border/80 bg-background/50 flex flex-col gap-1">
            <span className="text-muted-foreground">حالة الجهاز:</span>
            <div className="flex items-center gap-2 font-bold">
              <span
                className={`size-2 rounded-full ${
                  presence.isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className={presence.isOnline ? "text-emerald-600" : "text-rose-600"}>
                {presence.isOnline ? "متصل بالشبكة" : "غير متصل"}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-border/80 bg-background/50 flex flex-col gap-1">
            <span className="text-muted-foreground">موديل الهاتف:</span>
            <div className="font-bold truncate text-foreground">
              {presence.device?.deviceName || "غير محدد"}
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-border/80 bg-background/50 flex flex-col gap-1">
            <span className="text-muted-foreground">آخر استجابة:</span>
            <div className="font-mono text-[11px] text-foreground">
              {presence.device?.lastSeenAt
                ? new Date(presence.device.lastSeenAt).toLocaleTimeString("ar-EG")
                : "لا توجد"}
            </div>
          </div>
        </div>

        {/* Content / Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => {
                void fetchLogs();
                void refreshDevicePresence();
              }}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              <RotateCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              تحديث السجل
            </button>
            <span className="text-xs font-semibold text-muted-foreground">
              الأحداث المسجلة الحية ({logs.length})
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              <Activity className="size-8 mx-auto mb-2 opacity-40 animate-pulse" />
              لا توجد أحداث تشخيص مسجلة حتى الآن. تأكد من فتح تطبيق MaxP على الهاتف لربط الاتصال.
            </div>
          ) : (
            <div className="divide-y divide-border/60 border border-border rounded-xl overflow-hidden bg-background">
              {logs.map((logItem, idx) => (
                <div key={logItem.id || idx} className="p-3 text-xs flex flex-col gap-1.5 hover:bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {new Date(logItem.timestamp).toLocaleTimeString("ar-EG")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getEventBadge(logItem.event)}
                    </div>
                  </div>

                  {logItem.details && Object.keys(logItem.details).length > 0 && (
                    <div className="text-[11px] font-mono bg-muted/40 p-2 rounded-lg text-muted-foreground overflow-x-auto text-left" dir="ltr">
                      {JSON.stringify(logItem.details)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Shield className="size-3.5 text-primary" />
            نظام تتبع الاتصال المباشر عالي الأمان (E2E Telephony Observer)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
export default TelephonyDiagnosticsModal;
