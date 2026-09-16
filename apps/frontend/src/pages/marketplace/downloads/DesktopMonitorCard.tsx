import React, { useState } from "react";
import {
  Monitor,
  Check,
  Copy,
  Layers,
  Sparkles,
  DownloadCloud,
  ExternalLink,
  ShieldCheck,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlatformDetect } from "./usePlatformDetect";

interface DesktopMonitorCardProps {
  companyToken?: string;
}

export const DesktopMonitorCard: React.FC<DesktopMonitorCardProps> = ({
  companyToken,
}) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const { canInstallPwa, installPwa, isStandalone, os } = usePlatformDetect();

  const handleCopyToken = () => {
    if (!companyToken) {
      toast.info("يرجى تسجيل الدخول للحصول على معرف المنشأة المرجعي");
      return;
    }
    navigator.clipboard.writeText(companyToken);
    setCopiedToken(true);
    toast.success("تم نسخ معرّف المنشأة المرجعي لربط محطات العمل");
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const handleInstallDesktopPwa = async () => {
    if (canInstallPwa) {
      const ok = await installPwa();
      if (ok) {
        toast.success("جاري تثبيت تطبيق سطح المكتب المستقل...");
      }
    } else {
      toast.info("لتثبيت تطبيق سطح المكتب المستقل: انقر على أيقونة التثبيت (⤓) في شريط عنوان المتصفح أعلى اليمين");
    }
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
                <h3 className="text-base font-bold text-foreground">بيئة عمل سطح المكتب (Desktop Workstation)</h3>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary font-mono">
                  Windows &amp; Mac
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                تطبيق مستقل يثبت مباشرة على شريط المهام بالنظام
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-foreground shrink-0">
            بدون صلاحيات مسؤول IT
          </span>
        </div>

        {/* Core Specs Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">التوافق</div>
            <div className="text-xs font-semibold text-foreground mt-0.5">Windows 10 / 11 / Mac</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">نوع التطبيق</div>
            <div className="text-xs font-semibold text-foreground mt-0.5">Standalone Desktop App</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">زمن الاستجابة</div>
            <div className="text-xs font-semibold text-emerald-500 mt-0.5 font-mono tabular-nums">فوري (Instant)</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">التحديثات</div>
            <div className="text-xs font-semibold text-foreground mt-0.5">تلقائية صامتة</div>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2.5 mb-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Laptop className="size-3.5 text-primary shrink-0" />
            <span>يعمل كتطبيق منفصل ونافذة مستقلة خالية من إطارات المتصفح لزيادة التركيز والإنتاجية.</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary shrink-0" />
            <span>تثبيت في ثوانٍ معدودة دون الحاجة لحزم MSI/EXE أو طلب موافقة مدراء النظام IT.</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-primary shrink-0" />
            <span>تشفير كامل للبيانات والمصادقة مع السيرفر المركزي عبر شهادات TLS 1.3 المعتمدة.</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="size-3.5 text-primary shrink-0" />
            <span>تزامن لحظي لكل الفواتير والطلبات والمحادثات مع دعم التنبيهات الصوتية على شريط المهام.</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleInstallDesktopPwa}
            className={cn(
              "w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
            )}
          >
            <DownloadCloud className="size-4" />
            <span>{isStandalone ? "تطبيق سطح المكتب مثبت بالفعل" : "تثبيت تطبيق سطح المكتب الآن"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyToken}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            title="نسخ معرف المنشأة المرجعي"
          >
            {copiedToken ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            <span>نسخ معرّف المنشأة ({companyToken ? `${companyToken.slice(0, 8)}...` : "ربط الحساب"})</span>
          </button>
        </div>

        {/* Informational Hint */}
        <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>
            يدعم التثبيت المباشر على Chrome و Microsoft Edge و Brave عبر خيار "Install App".
          </span>
          <span className="font-mono text-foreground font-semibold shrink-0">v1.2</span>
        </div>
      </div>
    </div>
  );
};

export default DesktopMonitorCard;

