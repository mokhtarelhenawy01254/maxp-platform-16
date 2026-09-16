import React, { useState } from "react";
import {
  Monitor,
  Check,
  Copy,
  Download,
  ShieldCheck,
  Activity,
  Cpu,
  Layers,
  FileArchive,
} from "lucide-react";
import { toast } from "sonner";

interface DesktopMonitorCardProps {
  companyToken?: string;
}

export const DesktopMonitorCard: React.FC<DesktopMonitorCardProps> = ({
  companyToken,
}) => {
  const [copiedToken, setCopiedToken] = useState(false);

  // Live verified server endpoints (octet-stream / zip binaries)
  const installerUrl = "https://maxp.online/downloads/MaxP-Monitor-Setup.exe";
  const portableUrl = "https://maxp.online/downloads/MaxP-Monitor-Portable.zip";

  const handleCopyToken = () => {
    if (!companyToken) {
      toast.info("يرجى تسجيل الدخول للحصول على معرّف المنشأة المرجعي");
      return;
    }
    navigator.clipboard.writeText(companyToken);
    setCopiedToken(true);
    toast.success("تم نسخ معرّف المنشأة المرجعي لربط جهاز الموظف");
    setTimeout(() => setCopiedToken(false), 2500);
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm transition-all hover:border-border">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-11 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-foreground shrink-0">
              <Monitor className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                  برنامج مراقبة وإنتاجية فريق العمل
                </h3>
                <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                MaxP Workstation &amp; Employee Monitor for Windows
              </p>
            </div>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            جاهز للتحميل
          </span>
        </div>

        {/* Telemetry Strip - Single Surface Layout (No Box-in-Box) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2.5 px-3 rounded-lg bg-muted/40 border border-border/40 mb-4 text-center">
          <div>
            <span className="text-[10px] text-muted-foreground block">بيئة التشغيل</span>
            <span className="text-xs font-semibold text-foreground font-mono">Win 10/11 x64</span>
          </div>
          <div className="border-r border-border/30 pr-2">
            <span className="text-[10px] text-muted-foreground block">مثبت رسمي (.exe)</span>
            <span className="text-xs font-semibold text-foreground font-mono tabular-nums">84.1 MB</span>
          </div>
          <div className="border-r border-border/30 pr-2">
            <span className="text-[10px] text-muted-foreground block">نسخة محمولة (.zip)</span>
            <span className="text-xs font-semibold text-foreground font-mono tabular-nums">114.8 MB</span>
          </div>
          <div className="border-r border-border/30 pr-2">
            <span className="text-[10px] text-muted-foreground block">استهلاك الموارد</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">خفيف (&lt;0.5% CPU)</span>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2 mb-5 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Activity className="size-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-pretty">
              رصد النوافذ والبرامج النشطة تلقائياً بالثواني وكشف أوقات الخمول لحساب ساعات العمل الفعلية.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Layers className="size-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-pretty">
              طابور محلي مشفر (SQLite Offline Buffer) يضمن حفظ النشاط ومزامنته فور عودة الاتصال بالإنترنت.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="size-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-pretty">
              ربط مباشر ومحمي برمز المنشأة مع عزل تام لبيانات موظفي كل شركة دون إمكانية التلاعب بالوقت.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Cpu className="size-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-pretty">
              يعمل في صينية النظام (System Tray) مع إمكانية الإقلاع التلقائي مع بدء تشغيل الكمبيوتر.
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="space-y-3 pt-3 border-t border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Primary Setup EXE download */}
          <a
            href={installerUrl}
            download="MaxP-Monitor-Setup.exe"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Download className="size-4" />
            <span>تحميل مثبت البرنامج (Setup .exe)</span>
          </a>

          {/* Portable Zip download */}
          <a
            href={portableUrl}
            download="MaxP-Monitor-Portable.zip"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted px-4 py-2.5 text-xs font-medium text-foreground transition-all active:scale-[0.98]"
          >
            <FileArchive className="size-4 text-muted-foreground" />
            <span>النسخة المحمولة (Portable .zip)</span>
          </a>
        </div>

        {/* Company Token Quick-Copy Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-muted-foreground shrink-0">معرّف منشأتك لربط الجهاز:</span>
            <code className="rounded bg-background border border-border/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground truncate">
              {companyToken || "يرجى تسجيل الدخول"}
            </code>
          </div>

          <button
            type="button"
            onClick={handleCopyToken}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0"
          >
            {copiedToken ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            <span>نسخ الرمز الكامل</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopMonitorCard;


