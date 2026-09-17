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
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      toast.info("يرجى تسجيل الدخول للحصول على معرّف المنشأة المرجعي");
      return;
    }
    navigator.clipboard.writeText(companyToken);
    setCopiedToken(true);
    toast.success("تم نسخ معرّف المنشأة لربط جهاز الموظف");
    setTimeout(() => setCopiedToken(false), 2500);
  };

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm hover:border-primary/40 hover:bg-accent/[0.01] transition-all duration-200">
      {/* Top Header & Title */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="size-12 sm:size-14 rounded-2xl bg-muted/60 dark:bg-muted/30 border border-border/40 flex items-center justify-center shrink-0 text-foreground transition-transform duration-150">
              <Monitor className="size-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  برنامج مراقبة وإنتاجية فريق العمل (Windows)
                </h3>
                <Badge variant="outline" className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  v1.0.4 مستقر
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                MaxP Workstation &amp; Productivity Agent for Windows 10 &amp; 11
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            تحميل فوري
          </span>
        </div>

        {/* Telemetry Matrix Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">النظام المستهدف</span>
            <span className="text-xs font-bold text-foreground mt-0.5 block">Windows 10 / 11 (x64)</span>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">حجم ملف التثبيت</span>
            <span className="text-xs font-mono font-bold text-foreground mt-0.5 block tabular-nums">84.1 MB (.exe)</span>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">النسخة المحمولة</span>
            <span className="text-xs font-mono font-bold text-foreground mt-0.5 block tabular-nums">114.8 MB (.zip)</span>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">استهلاك الذاكرة</span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">&lt; 45 MB RAM</span>
          </div>
        </div>

        {/* Core Specs & Features List */}
        <div className="space-y-2.5 mb-6 text-xs text-muted-foreground">
          <div className="flex items-start gap-2.5">
            <Activity className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              رصد دقيق للنوافذ والبرامج النشطة بالثواني مع كشف فترات الخمول والتوقف واحتساب ساعات العمل الفعلية.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Layers className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              طابور تخزين محلي (Offline SQLite Buffer) يضمن استمرارية تسجيل العمل وحفظ البيانات عند انقطاع الإنترنت.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              ربط مباشر مشفر بمعرّف الشركة المركزي لضمان سلامة السجلات ومنع التلاعب من المستخدمين.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Cpu className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              يعمل في صمت كخدمة خلفية خفيفة مع بدء تشغيل النظام التلقائي دون التأثير على سرعة الجهاز.
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer & Downloads */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href={installerUrl}
            download="MaxP-Monitor-Setup.exe"
            className="w-full"
          >
            <Button
              className="w-full h-10 rounded-xl text-xs font-bold gap-2 shadow-sm active:scale-[0.98] transition-all"
            >
              <Download className="size-4" />
              <span>تحميل مثبت البرنامج (Setup .exe)</span>
            </Button>
          </a>

          <a
            href={portableUrl}
            download="MaxP-Monitor-Portable.zip"
            className="w-full"
          >
            <Button
              variant="outline"
              className="w-full h-10 rounded-xl text-xs font-bold gap-2 border-border/60 hover:bg-muted active:scale-[0.98] transition-all"
            >
              <FileArchive className="size-4 text-primary" />
              <span>نسخة محمولة (Portable .zip)</span>
            </Button>
          </a>
        </div>

        {/* Company Token Quick-Copy Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 rounded-xl border border-border/40 bg-muted/25 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground w-full sm:w-auto min-w-0">
            <Lock className="size-3.5 text-primary shrink-0" />
            <span className="font-semibold text-foreground shrink-0">معرّف منشأتك لربط العميل:</span>
            <code className="rounded-lg bg-background border border-border/60 px-2 py-0.5 font-mono text-[11px] text-foreground font-semibold truncate">
              {companyToken ? `${companyToken.slice(0, 16)}...` : "سجل الدخول لإظهار الرمز"}
            </code>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyToken}
            className="h-8 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 gap-1.5 shrink-0 self-end sm:self-auto"
          >
            {copiedToken ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            <span>{copiedToken ? "تم النسخ بنجاح" : "نسخ المعرّف"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DesktopMonitorCard;


