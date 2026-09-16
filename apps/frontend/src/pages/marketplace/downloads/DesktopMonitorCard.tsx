import React, { useState } from "react";
import {
  Monitor,
  Download,
  Terminal,
  Check,
  Copy,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Layers,
  ArrowDownToLine,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DesktopMonitorCardProps {
  companyToken?: string;
}

export const DesktopMonitorCard: React.FC<DesktopMonitorCardProps> = ({
  companyToken,
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const downloadUrl = "https://github.com/elhenawym124-ops/maxp-platform-10/releases/latest/download/MaxP-Monitor-Setup.exe";
  const installCmd = "winget install --id MaxP.EmployeeMonitor -e --accept-source-agreements";
  const magicLink = `https://maxp.online/desktop-onboard?token=${companyToken || "auto"}`;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(installCmd);
    setCopiedCmd(true);
    toast.success("تم نسخ أمر التثبيت السريع للطرفية");
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const handleCopyMagicLink = () => {
    navigator.clipboard.writeText(magicLink);
    setCopiedLink(true);
    toast.success("تم نسخ رابط التهيئة السريعة للموظف");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="relative flex flex-col justify-between rounded-xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm transition-all hover:border-primary/30">
      {/* Top Header Badge & Telemetry */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shrink-0">
              <Monitor className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">عميل مراقبة وإنتاجية الموظفين</h3>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary font-mono">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                MaxP Employee Monitor for Windows Desktop
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500 shrink-0">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            تحديثات صامتة مفعلة
          </span>
        </div>

        {/* Core Specs Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="rounded-lg border border-border/30 bg-muted/30 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">نظام التشغيل</div>
            <div className="text-xs font-semibold text-foreground mt-0.5">Windows 10 / 11</div>
          </div>
          <div className="rounded-lg border border-border/30 bg-muted/30 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">المعمارية</div>
            <div className="text-xs font-semibold text-foreground mt-0.5 font-mono">64-bit (x64)</div>
          </div>
          <div className="rounded-lg border border-border/30 bg-muted/30 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">حجم ملف التثبيت</div>
            <div className="text-xs font-semibold text-foreground mt-0.5 font-mono tabular-nums">~184 MB</div>
          </div>
          <div className="rounded-lg border border-border/30 bg-muted/30 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">استهلاك المعالج</div>
            <div className="text-xs font-semibold text-emerald-500 mt-0.5 font-mono tabular-nums">&lt; 0.5% CPU</div>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Cpu className="size-3.5 text-primary shrink-0" />
            <span>كاشف نوافذ وتطبيقات فائق السرعة عبر واجهات برمجة Win32 C# الأصلية.</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="size-3.5 text-primary shrink-0" />
            <span>تحديثات خلفية صامتة دون توقف عمل الموظف (Silent Delta Updates).</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary shrink-0" />
            <span>تشغيل إجباري تلقائي مع إقلاع النظام بدون خيار إيقاف للموظف.</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="size-3.5 text-primary shrink-0" />
            <span>طابور تخزين محلي SQLite يعمل بكفاءة كاملة حتى عند انقطاع الإنترنت.</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="space-y-3 pt-4 border-t border-border/30">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
            )}
          >
            <ArrowDownToLine className="size-4" />
            <span>تحميل لويندوز (Installer .exe)</span>
          </a>

          <button
            type="button"
            onClick={handleCopyMagicLink}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            title="رابط يرسل للموظف للتثبيت والتهيئة التلقائية"
          >
            {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            <span>رابط التهيئة السريعة للموظف</span>
          </button>
        </div>

        {/* Quick Command Snippet for IT/Devs */}
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-zinc-950/80 px-3 py-1.5 text-[11px] font-mono text-zinc-300">
          <div className="flex items-center gap-2 truncate">
            <Terminal className="size-3.5 text-zinc-500 shrink-0" />
            <span className="truncate">{installCmd}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyCmd}
            className="text-zinc-400 hover:text-zinc-100 transition-colors p-1"
            title="نسخ أمر التثبيت"
          >
            {copiedCmd ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopMonitorCard;
