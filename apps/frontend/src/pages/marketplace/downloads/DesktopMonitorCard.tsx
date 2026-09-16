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
  DownloadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DesktopMonitorCardProps {
  companyToken?: string;
}

export const DesktopMonitorCard: React.FC<DesktopMonitorCardProps> = ({
  companyToken,
}) => {
  const [copiedToken, setCopiedToken] = useState(false);

  // Live verified server endpoints
  const installerUrl = "https://maxp.online/downloads/MaxP-Monitor-Setup.exe";
  const portableUrl = "https://maxp.online/downloads/MaxP-Monitor-Portable.zip";

  const handleCopyToken = () => {
    if (!companyToken) {
      toast.info("يرجى تسجيل الدخول للحصول على معرف المنشأة المرجعي");
      return;
    }
    navigator.clipboard.writeText(companyToken);
    setCopiedToken(true);
    toast.success("تم نسخ معرّف المنشأة المرجعي لربط جهاز الموظف");
    setTimeout(() => setCopiedToken(false), 2500);
  };

  return (
    <div className="relative flex flex-col justify-between rounded-xl border border-border/50 bg-card p-5 sm:p-6 shadow-sm transition-all hover:border-primary/40">
      {/* Top Header Badge & Info */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shrink-0">
              <Monitor className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">عميل مراقبة وإنتاجية فريق العمل (Windows)</h3>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 font-mono">
                  v1.0.0 متاح للتحميل
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                MaxP Employee &amp; Workstation Monitor for Windows
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-500 shrink-0">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ملف التثبيت متاح
          </span>
        </div>

        {/* Core Specs Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">النظام</div>
            <div className="text-xs font-semibold text-foreground mt-0.5">Windows 10 / 11 (x64)</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">حجم ملف التثبيت</div>
            <div className="text-xs font-semibold text-foreground mt-0.5 font-mono tabular-nums">84.1 MB (.exe)</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">النسخة المحمولة</div>
            <div className="text-xs font-semibold text-foreground mt-0.5 font-mono tabular-nums">114.8 MB (.zip)</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">استهلاك الموارد</div>
            <div className="text-xs font-semibold text-emerald-500 mt-0.5 font-mono tabular-nums">فائق الخفة (Light)</div>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2.5 mb-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="size-3.5 text-primary shrink-0" />
            <span>رصد النوافذ والبرامج النشطة تلقائياً بالثواني وكشف أوقات الخمول وفترات العمل الفعلية.</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-primary shrink-0" />
            <span>ربط مباشر وتلقائي مع لوحة إدارة المنشأة عبر معرّف الشركة المشفر لمنع التلاعب.</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="size-3.5 text-primary shrink-0" />
            <span>طابور تخزين محلي (Offline SQLite Buffer) يضمن استمرارية تسجيل الأنشطة حتى عند انقطاع الشبكة.</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="size-3.5 text-primary shrink-0" />
            <span>يعمل في الخلفية مع إمكانية التشغيل التلقائي مع إقلاع النظام بدون استهلاك للذاكرة.</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Primary Setup EXE download */}
          <a
            href={installerUrl}
            download="MaxP-Monitor-Setup.exe"
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
            )}
          >
            <Download className="size-4" />
            <span>تحميل مثبت البرنامج (Setup .exe)</span>
          </a>

          {/* Portable Zip download */}
          <a
            href={portableUrl}
            download="MaxP-Monitor-Portable.zip"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm transition-all active:scale-[0.98]"
          >
            <FileArchive className="size-4 text-primary" />
            <span>نسخة محمولة (Portable .zip)</span>
          </a>
        </div>

        {/* Company Token Quick-Copy Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/25 p-2.5 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-semibold text-foreground">رمز منشأتك لربط العميل:</span>
            <code className="rounded bg-background border border-border/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              {companyToken ? `${companyToken.slice(0, 16)}...` : "سجل الدخول لإظهار الرمز"}
            </code>
          </div>

          <button
            type="button"
            onClick={handleCopyToken}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
          >
            {copiedToken ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            <span>نسخ الرمز الكامل للموظف</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopMonitorCard;


